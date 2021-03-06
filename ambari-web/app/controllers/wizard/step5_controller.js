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
var numberUtils = require('utils/number_utils');

App.WizardStep5Controller = Em.Controller.extend({
  name: "wizardStep5Controller",

  /**
   * Step title
   * Custom if <code>App.ReassignMasterController</code> is used
   * @type {string}
   */
  title: function () {
    if (this.get('content.controllerName') == 'reassignMasterController') {
      return Em.I18n.t('installer.step5.reassign.header');
    }
    return Em.I18n.t('installer.step5.header');
  }.property('content.controllerName'),

  /**
   * Is ReassignWizard used
   * @type {bool}
   */
  isReassignWizard: function () {
    return this.get('content.controllerName') == 'reassignMasterController';
  }.property('content.controllerName'),

  /**
   * Is isHighAvailabilityWizard used
   * @type {bool}
   */
  isHighAvailabilityWizard: function () {
    return this.get('content.controllerName') == 'highAvailabilityWizardController';
  }.property('content.controllerName'),

  /**
   * Is AddServiceWizard used
   * @type {bool}
   */
  isAddServiceWizard: function () {
    return this.get('content.controllerName') == 'addServiceController';
  }.property('content.controllerName'),

  /**
   * Master components which could be assigned to multiple hosts
   * @type {string[]}
   */
  multipleComponents: function () {
    return App.get('components.multipleMasters');
  }.property('App.components.multipleMasters'),

  /**
   * Master components which could be assigned to multiple hosts
   * @type {string[]}
   */
  addableComponents: function () {
    return App.get('components.addableMasterInstallerWizard');
  }.property('App.components.addableMasterInstallerWizard'),

  /**
   * Define state for submit button
   * @type {bool}
   */
  submitDisabled: false,

  /**
   * Trigger for executing host names check for components
   * Should de "triggered" when host changed for some component and when new multiple component is added/removed
   * @type {bool}
   */
  hostNameCheckTrigger: false,

  /**
   * List of hosts
   * @type {Array}
   */
  hosts: [],

  /**
   * Name of multiple component which host name was changed last
   * @type {Object|null}
   */
  componentToRebalance: null,

  /**
   * Name of component which host was changed last
   * @type {string}
   */
  lastChangedComponent: null,

  /**
   * Flag for rebalance multiple components
   * @type {number}
   */
  rebalanceComponentHostsCounter: 0,

  /**
   * @type {Ember.Enumerable}
   */
  servicesMasters: [],

  /**
   * @type {Ember.Enumerable}
   */
  selectedServicesMasters: [],


  /**
   * Is data for current step loaded
   * @type {bool}
   */
  isLoaded: false,

  /**
   * List of host with assigned masters
   * Format:
   * <code>
   *   [
   *     {
   *       host_name: '',
   *       hostInfo: {},
   *       masterServices: [],
   *       masterServicesToDisplay: [] // used only in template
   *    },
   *    ....
   *   ]
   * </code>
   * @type {Ember.Enumerable}
   */
  masterHostMapping: function () {
    var mapping = [], mappingObject, mappedHosts, hostObj;
    //get the unique assigned hosts and find the master services assigned to them
    mappedHosts = this.get("selectedServicesMasters").mapProperty("selectedHost").uniq();
    mappedHosts.forEach(function (item) {
      hostObj = this.get("hosts").findProperty("host_name", item);
      // User may input invalid host name (this is handled in hostname checker). Here we just skip it
      if (!hostObj) return;
      var masterServices = this.get("selectedServicesMasters").filterProperty("selectedHost", item),
        masterServicesToDisplay = [];
      masterServices.mapProperty('display_name').uniq().forEach(function (n) {
        masterServicesToDisplay.pushObject(masterServices.findProperty('display_name', n));
      });
      mappingObject = Em.Object.create({
        host_name: item,
        hostInfo: hostObj.host_info,
        masterServices: masterServices,
        masterServicesToDisplay: masterServicesToDisplay
      });

      mapping.pushObject(mappingObject);
    }, this);

    return mapping.sortProperty('host_name');
  }.property("selectedServicesMasters.@each.selectedHost", 'selectedServicesMasters.@each.isHostNameValid'),

  /**
   * Count of hosts without masters
   * @type {number}
   */
  remainingHosts: function () {
    if (this.get('content.controllerName') === 'installerController') {
      return 0;
    } else {
      return (this.get("hosts.length") - this.get("masterHostMapping.length"));
    }
  }.property('masterHostMapping.length', 'selectedServicesMasters.@each.selectedHost'),

  /**
   * Update submit button status
   * @metohd getIsSubmitDisabled
   */
  getIsSubmitDisabled: function () {
    var isSubmitDisabled = this.get('servicesMasters').someProperty('isHostNameValid', false);
    this.set('submitDisabled', isSubmitDisabled);
    return isSubmitDisabled;
  }.observes('servicesMasters.@each.selectedHost', 'servicesMasters.@each.isHostNameValid'),

  /**
   * Clear controller data (hosts, masters etc)
   * @method clearStep
   */
  clearStep: function () {
    this.set('hosts', []);
    this.set('selectedServicesMasters', []);
    this.set('servicesMasters', []);
    App.StackServiceComponent.find().forEach(function (stackComponent) {
      stackComponent.set('serviceComponentId', 1);
    }, this);

  },

  /**
   * Load controller data (hosts, host components etc)
   * @method loadStep
   */
  loadStep: function () {
    console.log("WizardStep5Controller: Loading step5: Assign Masters");
    this.clearStep();
    this.renderHostInfo();
    this.loadComponentRecommendations(this.loadStepCallback);
  },

  /**
   * Callback after load controller data (hosts, host components etc)
   * @method loadStepCallback
   */
  loadStepCallback: function(components, self) {
    self.renderComponents(components);

    self.get('addableComponents').forEach(function (componentName) {
      self.updateComponent(componentName);
    }, self);
    if (!self.get("selectedServicesMasters").filterProperty('isInstalled', false).length) {
      console.log('no master components to add');
      App.router.send('next');
    }
  },

  /**
   * Used to set showAddControl flag for installer wizard
   * @method updateComponent
   */
  updateComponent: function (componentName) {
    var component = this.last(componentName);
    if (!component) {
      return;
    }
    var services = App.StackService.find().filterProperty('isInstalled', true).mapProperty('serviceName');
    var currentService = componentName.split('_')[0];
    var showControl = !services.contains(currentService);

    if (showControl) {
      if (this.get("selectedServicesMasters").filterProperty("component_name", componentName).length < this.get("hosts.length") && !this.get('isReassignWizard') && !this.get('isHighAvailabilityWizard')) {
        component.set('showAddControl', true);
      } else {
        component.set('showRemoveControl', false);
      }
    }
  },

  /**
   * Load active host list to <code>hosts</code> variable
   * @method renderHostInfo
   */
  renderHostInfo: function () {
    var hostInfo = this.get('content.hosts');
    var result = [];

    for (var index in hostInfo) {
      var _host = hostInfo[index];
      if (_host.bootStatus === 'REGISTERED') {
        result.push(Em.Object.create({
          host_name: _host.name,
          cpu: _host.cpu,
          memory: _host.memory,
          disk_info: _host.disk_info,
          host_info: Em.I18n.t('installer.step5.hostInfo').fmt(_host.name, numberUtils.bytesToSize(_host.memory, 1, 'parseFloat', 1024), _host.cpu)
        }));
      }
    }
    this.set("hosts", result);
    this.sortHosts(this.get('hosts'));
    this.set('isLoaded', true);
  },

  /**
   * Sort list of host-objects by properties (memory - desc, cpu - desc, hostname - asc)
   * @param {object[]} hosts
   */
  sortHosts: function (hosts) {
    hosts.sort(function (a, b) {
      if (a.get('memory') == b.get('memory')) {
        if (a.get('cpu') == b.get('cpu')) {
          return a.get('host_name').localeCompare(b.get('host_name')); // hostname asc
        }
        return b.get('cpu') - a.get('cpu'); // cores desc
      }
      return b.get('memory') - a.get('memory'); // ram desc
    });
  },

  /**
   * Get recommendations info from API
   * @return {undefined}
   */
  loadComponentRecommendations: function(callback) {
    var self = this;

    if (App.router.get('installerController.recommendations') !== undefined) {
      // Don't do AJAX call if recommendations has been already received
      // But if user returns to previous step (selecting services), stored recommendations will be cleared in routers' next handler and AJAX call will be made again
      callback(self.createComponentInstalltationObjects(), self);
    } else {
      var selectedServices = App.StackService.find().filterProperty('isSelected').mapProperty('serviceName');
      var installedServices = App.StackService.find().filterProperty('isInstalled').mapProperty('serviceName');
      var services = installedServices.concat(selectedServices).uniq();

      var hostNames = self.get('hosts').mapProperty('host_name');

      return App.ajax.send({
        name: 'wizard.step5.recommendations',
        sender: self,
        data: {
          stackVersionUrl: App.get('stackVersionURL'),
          hosts: hostNames,
          services: services
        },
        success: 'loadRecommendationsSuccessCallback'
      }).
        retry({
          times: App.maxRetries,
          timeout: App.timeout
        }).
        then(function () {
          callback(self.createComponentInstalltationObjects(), self);
        },
        function () {
          App.showReloadPopup();
          console.log('Load recommendations failed');
        }
      );
    }
  },

  /**
   * Create components for displaying component-host comboboxes in UI assign dialog
   * expects installerController.recommendations will be filled with recommendations API call result
   * @return {Object[]}
   */
  createComponentInstalltationObjects: function() {
    var self = this;

    var masterComponents = [];
    if (self.get('isAddServiceWizard')) {
      masterComponents = App.StackServiceComponent.find().filterProperty('isShownOnAddServiceAssignMasterPage');
    } else {
      masterComponents = App.StackServiceComponent.find().filterProperty('isShownOnInstallerAssignMasterPage');
    }

    var masterHosts = self.get('content.masterComponentHosts'); //saved to local storage info
    var selectedNotInstalledServices = self.get('content.services').filterProperty('isSelected').filterProperty('isInstalled', false).mapProperty('serviceName');
    var recommendations = App.router.get('installerController.recommendations');

    var resultComponents = [];
    var multipleComponentHasBeenAdded = {};

    recommendations.blueprint.host_groups.forEach(function(host_group) {
      var hosts = recommendations.blueprint_cluster_binding.host_groups.findProperty('name', host_group.name).hosts;

      hosts.forEach(function(host) {
        host_group.components.forEach(function(component) {
          var willBeAdded = true;
          var fullComponent = masterComponents.findProperty('componentName', component.name);
          // If it's master component which should be shown
          if (fullComponent) {
            // If service is already installed and not being added as a new service then render on UI only those master components
            // that have already installed hostComponents.
            // NOTE: On upgrade there might be a prior installed service with non-installed newly introduced serviceComponent
            var isNotSelectedService = !selectedNotInstalledServices.contains(fullComponent.get('serviceName'));
            if (isNotSelectedService) {
              willBeAdded = App.HostComponent.find().someProperty('componentName', component.name);
            }

            if (willBeAdded) {
              var savedComponents = masterHosts.filterProperty('component', component.name);

              if (self.get('multipleComponents').contains(component.name) && savedComponents.length > 0) {
                if (!multipleComponentHasBeenAdded[component.name]) {
                  multipleComponentHasBeenAdded[component.name] = true;

                  savedComponents.forEach(function(saved) {
                    resultComponents.push(self.createComponentInstalltationObject(fullComponent, host.fqdn, saved));
                  });
                }
              } else {
                var savedComponent = masterHosts.findProperty('component', component.name);
                resultComponents.push(self.createComponentInstalltationObject(fullComponent, host.fqdn, savedComponent));
              }
            }
          }
        });
      });
    });
    return resultComponents;
  },

  /**
   * Create component for displaying component-host comboboxes in UI assign dialog
   * @param fullComponent - full component description
   * @param hostName - host fqdn where component will be installed
   * @param savedComponent - the same object which function returns but created before
   * @return {Object}
   */
  createComponentInstalltationObject: function(fullComponent, hostName, savedComponent) {
    var componentName = fullComponent.get('componentName');

    var componentObj = {};
    componentObj.component_name = componentName;
    componentObj.display_name = fullComponent.get('displayName');
    componentObj.serviceId = fullComponent.get('serviceName');
    componentObj.isServiceCoHost = App.StackServiceComponent.find().findProperty('componentName', componentName).get('isCoHostedComponent') && !this.get('isReassignWizard');

    if (savedComponent) {
      componentObj.selectedHost = savedComponent.hostName;
      componentObj.isInstalled = savedComponent.isInstalled;
    } else {
      componentObj.selectedHost = hostName;
      componentObj.isInstalled = false;
    }

    return componentObj;
  },

  /**
   * Success-callback for recommendations request
   * @param {object} data
   * @method loadRecommendationsSuccessCallback
   */
  loadRecommendationsSuccessCallback: function (data) {
    App.router.set('installerController.recommendations', data.resources[0].recommendations);
  },

  /**
   * @param {string} componentName
   * @returns {bool}
   * @private
   * @method _isHiveCoHost
   */
  _isHiveCoHost: function (componentName) {
    return ['HIVE_METASTORE', 'WEBHCAT_SERVER'].contains(componentName) && !this.get('isReassignWizard');
  },

  /**
   * Put master components to <code>selectedServicesMasters</code>, which will be automatically rendered in template
   * @param {Ember.Enumerable} masterComponents
   * @method renderComponents
   */
  renderComponents: function (masterComponents) {
    var installedServices = App.StackService.find().filterProperty('isSelected').filterProperty('isInstalled', false).mapProperty('serviceName'); //list of shown services
    var result = [];
    var serviceComponentId, previousComponentName;

    masterComponents.forEach(function (item) {
      var serviceComponent = App.StackServiceComponent.find().findProperty('componentName', item.component_name);
      var showRemoveControl = installedServices.contains(serviceComponent.get('stackService.serviceName')) &&
        (masterComponents.filterProperty('component_name', item.component_name).length > 1);
      var componentObj = Em.Object.create(item);
      console.log("TRACE: render master component name is: " + item.component_name);
      var masterComponent = App.StackServiceComponent.find().findProperty('componentName', item.component_name);
      if (masterComponent.get('isMasterWithMultipleInstances')) {
        previousComponentName = item.component_name;
        componentObj.set('serviceComponentId', result.filterProperty('component_name', item.component_name).length + 1);
        componentObj.set("showRemoveControl", showRemoveControl);
      }
      componentObj.set('isHostNameValid', true);
      result.push(componentObj);
    }, this);
    this.set("selectedServicesMasters", result);
    if (this.get('isReassignWizard')) {
      var components = result.filterProperty('component_name', this.get('content.reassign.component_name'));
      components.setEach('isInstalled', false);
      this.set('servicesMasters', components);
    } else {
      this.set('servicesMasters', result);
    }
  },

  /**
   * Update dependent co-hosted components according to the change in the component host
   * @method updateCoHosts
   */
  updateCoHosts: function () {
    var components = App.StackServiceComponent.find().filterProperty('isOtherComponentCoHosted');
    var selectedServicesMasters = this.get('selectedServicesMasters');
    components.forEach(function (component) {
      var componentName = component.get('componentName');
      var hostComponent = selectedServicesMasters.findProperty('component_name', componentName);
      var dependentCoHosts = component.get('coHostedComponents');
      dependentCoHosts.forEach(function (coHostedComponent) {
        var dependentHostComponent = selectedServicesMasters.findProperty('component_name', coHostedComponent);
        if (hostComponent && dependentHostComponent) dependentHostComponent.set('selectedHost', hostComponent.get('selectedHost'));
      }, this);
    }, this);
  }.observes('selectedServicesMasters.@each.selectedHost'),

  /**
   * On change callback for inputs
   * @param {string} componentName
   * @param {string} selectedHost
   * @param {number} serviceComponentId
   * @method assignHostToMaster
   */
  assignHostToMaster: function (componentName, selectedHost, serviceComponentId) {
    var flag = this.isHostNameValid(componentName, selectedHost);
    this.updateIsHostNameValidFlag(componentName, serviceComponentId, flag);
    if (serviceComponentId) {
      this.get('selectedServicesMasters').filterProperty('component_name', componentName).findProperty("serviceComponentId", serviceComponentId).set("selectedHost", selectedHost);
    }
    else {
      this.get('selectedServicesMasters').findProperty("component_name", componentName).set("selectedHost", selectedHost);
    }
  },

  /**
   * Determines if hostName is valid for component:
   * <ul>
   *  <li>host name shouldn't be empty</li>
   *  <li>host should exist</li>
   *  <li>host should have only one component with <code>componentName</code></li>
   * </ul>
   * @param {string} componentName
   * @param {string} selectedHost
   * @returns {boolean} true - valid, false - invalid
   * @method isHostNameValid
   */
  isHostNameValid: function (componentName, selectedHost) {
    return (selectedHost.trim() !== '') &&
      this.get('hosts').mapProperty('host_name').contains(selectedHost) &&
      (this.get('selectedServicesMasters').
        filterProperty('component_name', componentName).
        mapProperty('selectedHost').
        filter(function (h) {
          return h === selectedHost;
        }).length <= 1);
  },

  /**
   * Update <code>isHostNameValid</code> property with <code>flag</code> value
   * for component with name <code>componentName</code> and
   * <code>serviceComponentId</code>-property equal to <code>serviceComponentId</code>-parameter value
   * @param {string} componentName
   * @param {number} serviceComponentId
   * @param {bool} flag
   * @method updateIsHostNameValidFlag
   */
  updateIsHostNameValidFlag: function (componentName, serviceComponentId, flag) {
    if (componentName) {
      if (serviceComponentId) {
        this.get('selectedServicesMasters').filterProperty('component_name', componentName).findProperty("serviceComponentId", serviceComponentId).set("isHostNameValid", flag);
      } else {
        this.get('selectedServicesMasters').findProperty("component_name", componentName).set("isHostNameValid", flag);
      }
    }
  },

  /**
   * Returns last component of selected type
   * @param {string} componentName
   * @return {Em.Object|null}
   * @method last
   */
  last: function (componentName) {
    return this.get("selectedServicesMasters").filterProperty("component_name", componentName).get("lastObject");
  },

  /**
   * Add new component to ZooKeeper Server and Hbase master
   * @param {string} componentName
   * @return {bool} true - added, false - not added
   * @method addComponent
   */
  addComponent: function (componentName) {
    /*
     * Logic: If ZooKeeper or Hbase service is selected then there can be
     * minimum 1 ZooKeeper or Hbase master in total, and
     * maximum 1 ZooKeeper or Hbase on every host
     */

    var maxNumMasters = this.get("hosts.length"),
      currentMasters = this.get("selectedServicesMasters").filterProperty("component_name", componentName),
      newMaster = null,
      masterHosts = null,
      suggestedHost = null,
      i = 0,
      lastMaster = null;

    if (!currentMasters.length) {
      console.log('ALERT: Zookeeper service was not selected');
      return false;
    }

    if (currentMasters.get("length") < maxNumMasters) {

      currentMasters.set("lastObject.showAddControl", false);
      currentMasters.set("lastObject.showRemoveControl", true);

      //create a new master component host based on an existing one
      newMaster = Em.Object.create({});
      lastMaster = currentMasters.get("lastObject");
      newMaster.set("display_name", lastMaster.get("display_name"));
      newMaster.set("component_name", lastMaster.get("component_name"));
      newMaster.set("selectedHost", lastMaster.get("selectedHost"));
      newMaster.set("isInstalled", false);

      if (currentMasters.get("length") === (maxNumMasters - 1)) {
        newMaster.set("showAddControl", false);
      } else {
        newMaster.set("showAddControl", true);
      }
      newMaster.set("showRemoveControl", true);

      //get recommended host for the new Zookeeper server
      masterHosts = currentMasters.mapProperty("selectedHost").uniq();

      for (i = 0; i < this.get("hosts.length"); i++) {
        if (!(masterHosts.contains(this.get("hosts")[i].get("host_name")))) {
          suggestedHost = this.get("hosts")[i].get("host_name");
          break;
        }
      }

      newMaster.set("selectedHost", suggestedHost);
      newMaster.set("serviceComponentId", (currentMasters.get("lastObject.serviceComponentId") + 1));

      this.get("selectedServicesMasters").insertAt(this.get("selectedServicesMasters").indexOf(lastMaster) + 1, newMaster);

      this.set('componentToRebalance', componentName);
      this.incrementProperty('rebalanceComponentHostsCounter');
      this.toggleProperty('hostNameCheckTrigger');
      return true;
    }
    return false;//if no more zookeepers can be added
  },

  /**
   * Remove component from ZooKeeper server or Hbase Master
   * @param {string} componentName
   * @param {number} serviceComponentId
   * @return {bool} true - removed, false - no
   * @method removeComponent
   */
  removeComponent: function (componentName, serviceComponentId) {
    var currentMasters = this.get("selectedServicesMasters").filterProperty("component_name", componentName);

    //work only if the multiple master service is selected in previous step
    if (currentMasters.length <= 1) {
      return false;
    }

    this.get("selectedServicesMasters").removeAt(this.get("selectedServicesMasters").indexOf(currentMasters.findProperty("serviceComponentId", serviceComponentId)));

    currentMasters = this.get("selectedServicesMasters").filterProperty("component_name", componentName);
    if (currentMasters.get("length") < this.get("hosts.length")) {
      currentMasters.set("lastObject.showAddControl", true);
    }

    if (currentMasters.get("length") === 1) {
      currentMasters.set("lastObject.showRemoveControl", false);
    }

    this.set('componentToRebalance', componentName);
    this.incrementProperty('rebalanceComponentHostsCounter');
    this.toggleProperty('hostNameCheckTrigger');
    return true;
  },

  /**
   * Submit button click handler
   * @metohd submit
   */
  submit: function () {
    this.getIsSubmitDisabled();
    if (!this.get('submitDisabled')) {
      App.router.send('next');
    }
  }

});
