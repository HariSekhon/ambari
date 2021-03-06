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

App.stackServiceMapper = App.QuickDataMapper.create({
  model: App.StackService,
  component_model: App.StackServiceComponent,

  config: {
    id: 'service_name',
    service_name: 'service_name',
    config_types: 'config_types',
    comments: 'comments',
    service_version: 'service_version',
    stack_name: 'stack_name',
    stack_version: 'stack_version',
    is_selected: 'is_selected',
    is_installed: 'is_installed',
    service_components_key: 'service_components',
    service_components_type: 'array',
    service_components: {
      item: 'id'
    }
  },

  component_config: {
    id: 'component_name',
    component_name: 'component_name',
    cardinality: 'cardinality',
    service_name: 'service_name',
    component_category: 'component_category',
    is_master: 'is_master',
    is_client: 'is_client',
    stack_name: 'stack_name',
    stack_version: 'stack_version',
    stack_service_id: 'service_name',
    dependencies_key: 'dependencies',
    dependencies_type: 'array',
    dependencies: {
      item: 'Dependencies.component_name'
    }
  },

  mapStackServices: function(json) {
    this.clearStackModels();
    App.resetDsStoreTypeMap(App.StackServiceComponent);
    App.resetDsStoreTypeMap(App.StackService);
    this.map(json);
  },

  map: function (json) {
    var model = this.get('model');
    var result = [];
    var stackServiceComponents = [];
    this.rearrangeServicesForDisplayOrder(json.items, App.StackService.displayOrder);
    json.items.forEach(function (item) {
      //@TODO: Remove the condition when Flume becomes supported service in any stack
      if (item.StackServices.service_name !== 'FLUME' || App.supports.flume) {
        var stackService = item.StackServices;
        var serviceComponents = [];
        item.serviceComponents.forEach(function (serviceComponent) {
          serviceComponent.StackServiceComponents.id = serviceComponent.StackServiceComponents.component_name;
          serviceComponent.StackServiceComponents.dependencies = serviceComponent.dependencies;
          serviceComponents.push(serviceComponent.StackServiceComponents);
          stackServiceComponents.push(this.parseIt(serviceComponent.StackServiceComponents, this.get('component_config')));
        }, this);
        stackService.service_components = serviceComponents;
        result.push(this.parseIt(stackService, this.get('config')));
      }
    }, this);
    App.store.loadMany(this.get('component_model'), stackServiceComponents);
    App.store.loadMany(model, result);
  },

  /**
   * Clean store from already loaded data.
   **/
  clearStackModels: function () {
    var models = [App.StackServiceComponent, App.StackService];
    models.forEach(function (model) {
      var records = App.get('store').findAll(model).filterProperty('id');
      records.forEach(function (rec) {
        Ember.run(this, function () {
          rec.deleteRecord();
        });
      }, this);
    }, this);
  },

  rearrangeServicesForDisplayOrder: function (array, displayOrderArray) {
    return array.sort(function (a, b) {
      var aValue = displayOrderArray.indexOf(a.StackServices.service_name) != -1 ? displayOrderArray.indexOf(a.StackServices.service_name) : array.length;
      var bValue = displayOrderArray.indexOf(b.StackServices.service_name) != -1 ? displayOrderArray.indexOf(b.StackServices.service_name) : array.length;
      return aValue - bValue;
    });
  }
});

