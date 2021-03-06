/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var App = require('app');

/**
 * initialize common cache container for mappers
 * App.cache contains shared data, used for syncronizing incoming server data among mappers
 */
App.cache = {
  'HostsList': [],
  'previousHostStatuses': {},
  'previousComponentStatuses': {},
  'previousComponentPassiveStates': {},
  'hostComponentsOnService': {},
  'restartRequiredServices': [],
  'services': []
};

App.ServerDataMapper = Em.Object.extend({
  jsonKey: false,
  map: function (json) {
    if (json) {
      var model = this.get('model');
      var jsonKey = this.get('jsonKey');

      if (jsonKey && json[jsonKey]) { // if data come as { hdfs: {...} }
        json = json[jsonKey];
      }

      $.each(json, function (field, value) {
        model.set(field, value);
      })
    }
  }
});


App.QuickDataMapper = App.ServerDataMapper.extend({
  config: {},
  model: null,
  map: function (json) {
    if (!this.get('model')) {
      return;
    }

    if (json.items) {
      var result = [];

      json.items.forEach(function (item) {
        result.push(this.parseIt(item, this.config));
      }, this);

      App.store.loadMany(this.get('model'), result);
    }
  },

  parseIt: function (data, config) {
    var result = {};
    for ( var i in config) {
      if (i.substr(0, 1) === '$') {
        i = i.substr(1, i.length);
        result[i] = config['$' + i];
      } else {
        var isSpecial = false;
        if (i.substr(-5) == '_type') {
          var prefix = i.substr(0, i.length - 5);
          isSpecial = config[prefix + '_key'] != null;
        } else if (i.substr(-4) == '_key') {
          var prefix = i.substr(0, i.length - 4);
          isSpecial = config[prefix + '_type'] != null;
        }
        if (!isSpecial && typeof config[i] == 'string') {
          result[i] = this.getJsonProperty(data, config[i]);
        } else if (typeof config[i] == 'object') {
          result[i] = [];
          var _data = this.getJsonProperty(data, config[i + '_key']);
          var _type = config[i + '_type'];
          var l = _data.length;
          for ( var index = 0; index < l; index++) {
            if (_type == 'array') {
              result[i].push(this.getJsonProperty(_data[index], config[i].item));
            } else {
              result[i].push(this.parseIt(_data[index], config[i]));
            }
          }
          if(_type == 'array'){
            result[i] = result[i].sort();
          }
        }
      }
    }
    return result;
  },

  getJsonProperty: function (json, path) {
    var pathArr = path.split('.');
    var current = json;
    pathArr = this.filterDotted(pathArr);
    while (pathArr.length && current) {
      if (pathArr[0].substr(-1) == ']') {
        var index = parseInt(pathArr[0].substr(-2, 1));
        var attr = pathArr[0].substr(0, pathArr[0].length - 3);
        if (attr in current) {
          current = current[attr][index];
        }
      } else {
        current = current[pathArr[0]];
      }
      pathArr.splice(0, 1);
    }
    return current;
  },

  filterDotted: function(arr) {
    var buffer = [];
    var dottedBuffer = [];
    var dotted = false;
    arr.forEach(function(item) {
      if(/\['|\["/.test(item)) {
        dottedBuffer.push(item.substr(2, item.length));
        dotted = true;
      } else if (dotted && !/\]'|"\]/.test(item)) {
        dottedBuffer.push(item);
      } else if (/']|"]/.test(item)) {
        dottedBuffer.push(item.substr(0, item.length - 2));
        buffer.push(dottedBuffer.join('.'));
        dotted = false;
        dottedBuffer = [];
      } else {
        buffer.push(item);
      }
    });

    return buffer;
  },

  /**
   * properly delete record from model
   * @param item
   */
  deleteRecord: function (item) {
    item.deleteRecord();
    App.store.commit();
    item.get('stateManager').transitionTo('loading');
    console.log('Record with id:' + item.get('id') + ' was deleted from model');
  },
  /**
   * check mutable fields whether they have been changed and if positive
   * return host object only with properties, that contains new value
   * @param current
   * @param previous
   * @param fields
   * @return {*}
   */
  getDiscrepancies: function (current, previous, fields) {
    var result = {};
    if (previous) {
      fields.forEach(function (field) {
        if (Array.isArray(current[field])) {
          if (JSON.stringify(current[field]) !== JSON.stringify(previous[field])) {
            result[field] = current[field];
            result.isLoadNeeded = true;
          }
        } else {
          if (current[field] != previous[field]) result[field] = current[field];
        }
      });
      return result;
    }
    return current;
  },

  calculateState: function (json) {
//    var stateEqual = (json.desired_status != json.work_status);
//    if (stateEqual) {
//      if (json.desired_status == 'STARTED' && json.work_status == 'INSTALLED') {
//        json.work_status = 'STARTING';
//      } else if (json.desired_status == 'INSTALLED' && json.work_status == 'STARTED') {
//        json.work_status = 'STOPPING';
//      }
//    }
    return json;
  }
});
