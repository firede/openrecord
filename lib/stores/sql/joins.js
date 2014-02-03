var Utils = require('../../utils');

/*
 * MODEL
 */
exports.model = {
  join: function(relations, type){
    var self = this.chain();

    if(typeof type == 'string' && ['left', 'inner', 'outer', 'right'].indexOf(type.toLowerCase()) != -1){
      if(!(relations instanceof Array)){
        relations = [relations];
      }
    }else{
      relations = Utils.args(arguments);
      type = 'left';
    }
    
    
    var parseJoins = function(relations, parent, name_tree){
      for(var i = 0; i < relations.length; i++){
        if(typeof relations[i] == 'string'){
          var relation = parent.definition.relations[relations[i]];
          if(relation){
            self.addInternal('joins', {
              relation:relation, 
              type:type, 
              parent:parent, 
              name_tree: name_tree.concat(relation.name)
            }); 
          }else{
            throw new Error('Can not find relation ' + relations[i]+ ' on ' + parent.definition.model_name);
          }
        }else{
          if(relations[i] instanceof Array){
            
            parseJoins(relations[i], parent, name_tree);
            
          }else{

            for(var name in relations[i]){
              var relation = parent.definition.relations[name];
              if(relation){
                self.addInternal('joins', {
                  relation:relation, 
                  type:type, 
                  parent:parent,
                  name_tree: name_tree.concat(relation.name)
                }); 
                parseJoins([relations[i][name]], relation.model, name_tree.concat(relation.name));
              }else{
                throw new Error('Can not find relation ' + name + ' on ' + parent.definition.model_name);
              }
            }
            
          }
        }          
      }
    };
        
    parseJoins(relations, self, []);

    return self;
  },
  
  
  left_join: function(){
    return this.join(Utils.args(arguments), 'left');
  }
};



/*
 * DEFINITION
 */
exports.definition = {
  mixinCallback: function(){
    var self = this;  

    this.beforeFind(function(query){
      var joins = this.getInternal('joins') || [];
      var table_map = {};
    
      for(var i = 0; i < joins.length; i++){
        var relation = joins[i].relation;
        var name_tree = joins[i].name_tree;
        var table_name = relation.model.definition.table_name;
        
        var parent_name = joins[i].parent.definition.table_name;
        var name = table_name;
        
        if(name_tree.length === 2){
          parent_name = name_tree[0];
          name = name_tree[0] + '_' + name_tree[1];
        }
        
        if(name_tree.length > 2){
          var l = name_tree.length;
          parent_name = name_tree[l - 3] + '_' + name_tree[l - 2];
          name        = name_tree[l - 2] + '_' + name_tree[l - 1];
        }
        
        var as = '';        
        
        if(table_name != name){
          as = ' AS ' + name;
        }
        
        joins[i].name = name;
        table_map[name_tree.join('.')] = name;
        
        query.join(table_name + as, parent_name + '.' + relation.primary_key, '=', name + '.' + relation.foreign_key, joins[i].type);
      }
         
      this.setInternal('table_map', table_map);
            
      return true;
    }, 90);
    
    
    
    this.afterFind(function(data){
      var records = data.result;
      var joins = this.getInternal('joins') || [];
      
      if(joins.length === 0) return true;
                 
                 
      //Combines arrays of records and subrecords by their key
      var deepCombine = function(data, primary_keys, depth){
        var keys = {};
        var records = [];
        
        depth = depth || 0;
                
        for(var r in data){
          var key = [];        
          //What if there is no primary key?
          for(var p in primary_keys){
            key.push(data[r][primary_keys[p]]);
          }
          key = key.join(',');

          if(!keys[key]){
            keys[key] = data[r];
            records.push(data[r]);
          }else{
            for(var i in joins){
              var relation = joins[i].relation;
              var names = joins[i].name_tree;   
                            
              if(relation.type == 'has_many'){           
                var sub = data[r][names[depth]];
                var ori = keys[key][names[depth]];
                                
                if(ori && sub){    
                  if(ori && !(ori instanceof Array)){
                    keys[key][names[depth]] = ori = [ori];
                  }
                              
                  ori.push(sub);
                  keys[key][names[depth]] = deepCombine(ori, relation.model.definition.primary_keys, depth + 1);
                }                
                
              }
              
            }
          }          
          
        }
        
        return records;
      }
      
      data.result = deepCombine(records, self.primary_keys);
      return true;
      
    }, 90);
    
  }
};