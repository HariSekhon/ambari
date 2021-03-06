"""
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

"""

from resource_management import *


class HdfsServiceCheck(Script):
  def service_check(self, env):
    import params

    env.set_params(params)
    unique = functions.get_unique_id_and_date()
    dir = '/tmp'
    tmp_file = format("{dir}/{unique}")

    safemode_command = "dfsadmin -safemode get | grep OFF"

    create_dir_cmd = format("fs -mkdir {dir} ; hadoop fs -chmod 777 {dir}")
    test_dir_exists = format("hadoop fs -test -e {dir}")
    cleanup_cmd = format("fs -rm {tmp_file}")
    #cleanup put below to handle retries; if retrying there wil be a stale file
    #that needs cleanup; exit code is fn of second command
    create_file_cmd = format(
      "{cleanup_cmd}; hadoop fs -put /etc/passwd {tmp_file}")
    test_cmd = format("fs -test -e {tmp_file}")
    if params.security_enabled:
      Execute(format(
        "su - {smoke_user} -c '{kinit_path_local} -kt {smoke_user_keytab} "
        "{smoke_user}'"))
    ExecuteHadoop(safemode_command,
                  user=params.smoke_user,
                  logoutput=True,
                  conf_dir=params.hadoop_conf_dir,
                  try_sleep=15,
                  tries=20
    )
    ExecuteHadoop(create_dir_cmd,
                  user=params.smoke_user,
                  logoutput=True,
                  not_if=test_dir_exists,
                  conf_dir=params.hadoop_conf_dir,
                  try_sleep=3,
                  tries=5
    )
    ExecuteHadoop(create_file_cmd,
                  user=params.smoke_user,
                  logoutput=True,
                  conf_dir=params.hadoop_conf_dir,
                  try_sleep=3,
                  tries=5
    )
    ExecuteHadoop(test_cmd,
                  user=params.smoke_user,
                  logoutput=True,
                  conf_dir=params.hadoop_conf_dir,
                  try_sleep=3,
                  tries=5
    )
    if params.has_journalnode_hosts:
      journalnode_port = params.journalnode_port
      smoke_test_user = params.smoke_user
      checkWebUIFileName = "checkWebUI.py"
      checkWebUIFilePath = format("{tmp_dir}/{checkWebUIFileName}")
      comma_sep_jn_hosts = ",".join(params.journalnode_hosts)
      checkWebUICmd = format(
        "su - {smoke_test_user} -c 'python {checkWebUIFilePath} -m "
        "{comma_sep_jn_hosts} -p {journalnode_port}'")
      File(checkWebUIFilePath,
           content=StaticFile(checkWebUIFileName))

      Execute(checkWebUICmd,
              logoutput=True,
              try_sleep=3,
              tries=5
      )

    if params.has_zkfc_hosts:
      pid_dir = format("{hadoop_pid_dir_prefix}/{hdfs_user}")
      pid_file = format("{pid_dir}/hadoop-{hdfs_user}-zkfc.pid")
      check_zkfc_process_cmd = format(
        "ls {pid_file} >/dev/null 2>&1 && ps `cat {pid_file}` >/dev/null 2>&1")
      Execute(check_zkfc_process_cmd,
              logoutput=True,
              try_sleep=3,
              tries=5
      )


if __name__ == "__main__":
  HdfsServiceCheck().execute()
