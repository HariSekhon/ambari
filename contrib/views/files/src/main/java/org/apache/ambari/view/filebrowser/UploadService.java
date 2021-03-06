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

package org.apache.ambari.view.filebrowser;

import java.io.IOException;
import java.io.InputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import javax.ws.rs.Consumes;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

import org.apache.ambari.view.ViewContext;
import org.apache.hadoop.fs.FSDataOutputStream;

import com.sun.jersey.core.header.FormDataContentDisposition;
import com.sun.jersey.multipart.FormDataParam;

/**
 * Upload service
 */
public class UploadService extends HdfsService {

  /**
   * Constructor
   * @param context View Context instance
   */
  public UploadService(ViewContext context) {
    super(context);
  }

  private void uploadFile(final String filePath, InputStream uploadedInputStream)
      throws IOException, Exception {
    byte[] chunk = new byte[1024];
    FSDataOutputStream out = getApi(context).create(filePath, false);
    while (uploadedInputStream.read(chunk) != -1) {
      out.write(chunk);
    }
    out.close();
  }

  /**
   * Upload file
   * @param uploadedInputStream file input stream
   * @param contentDisposition content disposition
   * @param path path
   * @return file status
   * @throws Exception
   */
  @PUT
  @Consumes(MediaType.MULTIPART_FORM_DATA)
  @Produces(MediaType.APPLICATION_JSON)
  public Response uploadFile(
      @FormDataParam("file") InputStream uploadedInputStream,
      @FormDataParam("file") FormDataContentDisposition contentDisposition,
      @FormDataParam("path") String path) throws Exception {
    if (!path.endsWith("/"))
      path = path + "/";
    String filePath = path + contentDisposition.getFileName();
    uploadFile(filePath, uploadedInputStream);
    return Response.ok(
        HdfsApi.fileStatusToJSON(getApi(context).getFileStatus(filePath)))
        .build();
  }

  /**
   * Upload zip and unpack
   * @param uploadedInputStream file input stream
   * @param contentDisposition content disposition
   * @param path path
   * @return files statuses
   * @throws IOException
   * @throws Exception
   */
  @PUT
  @Path("/zip")
  @Consumes(MediaType.MULTIPART_FORM_DATA)
  @Produces(MediaType.APPLICATION_JSON)
  public Response uploadZip(
      @FormDataParam("file") InputStream uploadedInputStream,
      @FormDataParam("file") FormDataContentDisposition contentDisposition,
      @FormDataParam("path") String path) throws Exception {
    if (!path.endsWith("/"))
      path = path + "/";
    ZipInputStream zip = new ZipInputStream(uploadedInputStream);
    ZipEntry ze = zip.getNextEntry();
    HdfsApi api = getApi(context);
    while (ze != null) {
      String filePath = path + ze.getName();
      if (ze.isDirectory()) {
        api.mkdir(filePath);
      } else {
        uploadFile(filePath, zip);
      }
      ze = zip.getNextEntry();
    }
    return Response.ok(HdfsApi.fileStatusToJSON(api.listdir(path))).build();
  }

}
