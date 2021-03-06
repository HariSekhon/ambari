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
 * See the License for the specific language governing privileges and
 * limitations under the License.
 */
package org.apache.ambari.server.controller.internal;

import org.apache.ambari.server.AmbariException;
import org.apache.ambari.server.controller.spi.Resource;
import org.apache.ambari.server.orm.entities.GroupEntity;
import org.apache.ambari.server.orm.entities.PrivilegeEntity;
import org.apache.ambari.server.orm.entities.ResourceTypeEntity;
import org.apache.ambari.server.orm.entities.UserEntity;
import org.apache.ambari.server.orm.entities.ViewEntity;
import org.apache.ambari.server.orm.entities.ViewInstanceEntity;
import org.apache.ambari.server.view.ViewRegistry;

import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Resource provider for view privilege resources.
 */
public class ViewPrivilegeResourceProvider extends PrivilegeResourceProvider<ViewInstanceEntity> {

  /**
   * View privilege property id constants.
   */
  public static final String PRIVILEGE_VIEW_NAME_PROPERTY_ID     = "PrivilegeInfo/view_name";
  public static final String PRIVILEGE_VIEW_VERSION_PROPERTY_ID  = "PrivilegeInfo/version";
  public static final String PRIVILEGE_INSTANCE_NAME_PROPERTY_ID = "PrivilegeInfo/instance_name";

  /**
   * The property ids for a privilege resource.
   */
  private static Set<String> propertyIds = new HashSet<String>();
  static {
    propertyIds.add(PRIVILEGE_VIEW_NAME_PROPERTY_ID);
    propertyIds.add(PRIVILEGE_VIEW_VERSION_PROPERTY_ID);
    propertyIds.add(PRIVILEGE_INSTANCE_NAME_PROPERTY_ID);
    propertyIds.add(PRIVILEGE_ID_PROPERTY_ID);
    propertyIds.add(PERMISSION_NAME_PROPERTY_ID);
    propertyIds.add(PRINCIPAL_NAME_PROPERTY_ID);
    propertyIds.add(PRINCIPAL_TYPE_PROPERTY_ID);
  }

  /**
   * The key property ids for a privilege resource.
   */
  private static Map<Resource.Type, String> keyPropertyIds = new HashMap<Resource.Type, String>();
  static {
    keyPropertyIds.put(Resource.Type.View, PRIVILEGE_VIEW_NAME_PROPERTY_ID);
    keyPropertyIds.put(Resource.Type.ViewVersion, PRIVILEGE_VIEW_VERSION_PROPERTY_ID);
    keyPropertyIds.put(Resource.Type.ViewInstance, PRIVILEGE_INSTANCE_NAME_PROPERTY_ID);
    keyPropertyIds.put(Resource.Type.ViewPrivilege, PRIVILEGE_ID_PROPERTY_ID);
  }


  // ----- Constructors ------------------------------------------------------

  /**
   * Construct an ViewPrivilegeResourceProvider.
   */
  public ViewPrivilegeResourceProvider() {
    super(propertyIds, keyPropertyIds, Resource.Type.ViewPrivilege);
  }


  // ----- AbstractResourceProvider ------------------------------------------

  @Override
  public Map<Resource.Type, String> getKeyPropertyIds() {
    return keyPropertyIds;
  }


  // ----- PrivilegeResourceProvider -----------------------------------------

  @Override
  public Map<Long, ViewInstanceEntity> getResourceEntities(Map<String, Object> properties) {
    ViewRegistry viewRegistry = ViewRegistry.getInstance();

    String viewName     = (String) properties.get(PRIVILEGE_VIEW_NAME_PROPERTY_ID);
    String viewVersion  = (String) properties.get(PRIVILEGE_VIEW_VERSION_PROPERTY_ID);
    String instanceName = (String) properties.get(PRIVILEGE_INSTANCE_NAME_PROPERTY_ID);

    if (viewName != null && viewVersion != null && instanceName != null) {
      ViewInstanceEntity viewInstanceEntity =
          viewRegistry.getInstanceDefinition(viewName, viewVersion, instanceName);

      return Collections.singletonMap(viewInstanceEntity.getResource().getId(), viewInstanceEntity);
    }

    Set<ViewEntity> viewEntities = new HashSet<ViewEntity>();

    if (viewVersion != null) {
      ViewEntity viewEntity = viewRegistry.getDefinition(viewName, viewVersion);
      if (viewEntity != null) {
        viewEntities.add(viewEntity);
      }
    } else {
      for (ViewEntity viewEntity : viewRegistry.getDefinitions()) {
        if (viewName == null || viewEntity.getCommonName().equals(viewName)) {
          viewEntities.add(viewEntity);
        }
      }
    }

    Map<Long, ViewInstanceEntity> resourceEntities = new HashMap<Long, ViewInstanceEntity>();

    for (ViewEntity viewEntity : viewEntities) {
      for (ViewInstanceEntity viewInstanceEntity : viewEntity.getInstances()) {
        resourceEntities.put(viewInstanceEntity.getResource().getId(), viewInstanceEntity);
      }
    }
    return resourceEntities;
  }


  // ----- helper methods ----------------------------------------------------

  @Override
  protected boolean checkResourceTypes(PrivilegeEntity entity) throws AmbariException {
    return super.checkResourceTypes(entity) ||
        entity.getPermission().getResourceType().getId().equals(ResourceTypeEntity.VIEW_RESOURCE_TYPE);
  }

  @Override
  protected Resource toResource(PrivilegeEntity privilegeEntity,
                                Map<Long, UserEntity> userEntities,
                                Map<Long, GroupEntity> groupEntities,
                                Map<Long, ViewInstanceEntity> resourceEntities, Set<String> requestedIds) {
    Resource resource = super.toResource(privilegeEntity, userEntities, groupEntities, resourceEntities, requestedIds);
    if (resource != null) {

      ViewInstanceEntity viewInstanceEntity = resourceEntities.get(privilegeEntity.getResource().getId());
      ViewEntity         viewEntity         = viewInstanceEntity.getViewEntity();

      setResourceProperty(resource, PRIVILEGE_VIEW_NAME_PROPERTY_ID, viewEntity.getCommonName(), requestedIds);
      setResourceProperty(resource, PRIVILEGE_VIEW_VERSION_PROPERTY_ID, viewEntity.getVersion(), requestedIds);
      setResourceProperty(resource, PRIVILEGE_INSTANCE_NAME_PROPERTY_ID, viewInstanceEntity.getName(), requestedIds);
    }
    return resource;
  }
}

