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

require('controllers/main/admin/misc_controller');

App.RMHighAvailabilityWizardStep4Controller = App.HighAvailabilityProgressPageController.extend({

  name: "rMHighAvailabilityWizardStep4Controller",

  isRMHA: true,

  clusterDeployState: 'RM_HIGH_AVAILABILITY_DEPLOY',

  commands: ['stopRequiredServices', 'installResourceManager', 'reconfigureYARN', 'startAllServices'],

  tasksMessagesPrefix: 'admin.rm_highAvailability.wizard.step',

  stopRequiredServices: function () {
    var list = App.Service.find().mapProperty("serviceName").without("HDFS").join(',');
    App.ajax.send({
      name: 'common.services.update',
      sender: this,
      data: {
        "context": "Stop without HDFS",
        "ServiceInfo": {
          "state": "INSTALLED"
        },
        urlParams: "ServiceInfo/service_name.in(" + list + ")"},
      success: 'startPolling',
      error: 'onTaskError'
    });
  },

  installResourceManager: function () {
    var hostName = this.get('content.rmHosts.additionalRM');
    this.createComponent('RESOURCEMANAGER', hostName, "YARN");
  },

  reconfigureYARN: function () {
    this.loadConfigsTags();
  },

  loadConfigsTags: function () {
    App.ajax.send({
      name: 'config.tags',
      sender: this,
      success: 'onLoadConfigsTags',
      error: 'onTaskError'
    });
  },

  onLoadConfigsTags: function (data) {
    App.ajax.send({
      name: 'reassign.load_configs',
      sender: this,
      data: {
        urlParams: '(type=yarn-site&tag=' + data.Clusters.desired_configs['yarn-site'].tag + ')'
      },
      success: 'onLoadConfigs',
      error: 'onTaskError'
    });
  },

  onLoadConfigs: function (data) {
    var propertiesToAdd = this.get('content.configs');
    var configs = data.items[0].properties;

    propertiesToAdd.forEach(function (property) {
      configs[property.name] = property.value;
    });

    App.ajax.send({
      name: 'reassign.save_configs',
      sender: this,
      data: {
        siteName: 'yarn-site',
        properties: configs
      },
      success: 'onSaveConfigs',
      error: 'onTaskError'
    });
  },

  onSaveConfigs: function () {
    this.onTaskCompleted();
  },

  startAllServices: function () {
    App.ajax.send({
      name: 'common.services.update',
      sender: this,
      data: {
        "context": "Start all services",
        "ServiceInfo": {
          "state": "STARTED"
        },
        urlParams: "params/run_smoke_test=true"
      },
      success: 'startPolling',
      error: 'onTaskError'
    });
  }
});

