import React from 'react';
import { Layout, Row, Col, Button, Spin, List, Checkbox, Input } from "antd"
import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { useWallet, InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import { useState, useEffect } from "react";



const moduleAddress = "a735bb18fec6df6c39e68a91d0f077fd7a55e179b54f6a79d72b32ae79459a99"

type Task = {
  address: string;
  completed: boolean;
  content: string;
  task_id: string;
};

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { account, signAndSubmitTransaction } = useWallet(); //extract the account connected from the wallet adapter
   //when there is no user the account object is null
  const [newTask, setNewTask] = useState<string>("");
  const onWriteTask = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setNewTask(value);
  };

  const [transactionInProgress, setTransactionInProgress] = useState<boolean>(false);
  const [accountHasList, setAccountHasList] = useState<boolean>(false);

  const fetchList = async () => {
    if (!account) return [];
    try {
      const todoListResource = await aptos.getAccountResource({
        accountAddress: account?.address,
        resourceType: `${moduleAddress}::todolist::TodoList`
      });
      setAccountHasList(true);
      // tasks table handle
      const tableHandle = (todoListResource as any).tasks.handle;
      // tasks table counter
      const taskCounter = (todoListResource as any).task_counter;

      let tasks = [];
      let counter = 1;
      while (counter <= taskCounter) {
        const tableItem = {
          key_type: "u64",
          value_type: `${moduleAddress}::todolist::Task`,
          key: `${taskCounter}`,
        };
        const task = await aptos.getTableItem<Task>({ handle: tableHandle, data: tableItem });
        tasks.push(task);
        counter++;
      }
      // set tasks in local state
      setTasks(tasks);
    } catch (e: any) {
      setAccountHasList(false);
    }
  };

  const addNewList = async () => {
    if (!account) return [];
    setTransactionInProgress(true);
    const transaction: InputTransactionData = {
      data: {
        function: `${moduleAddress}::todolist::create_list`,
        functionArguments: []
      }
    };
    try {
      // sign and submit transaction to chain
      const response = await signAndSubmitTransaction(transaction);
      // wait for transaction
      await aptos.waitForTransaction({ transactionHash: response.hash });
      setAccountHasList(true);
    } catch (error: any) {
      setAccountHasList(false);
    } finally {
      setTransactionInProgress(false);
    }
  };

  //with the above function we are verifying if an account has created a list

  useEffect(() => {
    fetchList();
  }, [account?.address]);

  
  const onTaskAdded = async () => {
    // check for connected account
    if (!account) return;
    setTransactionInProgress(true);
    const transaction:InputTransactionData = {
      data:{
        function:`${moduleAddress}::todolist::create_task`,
        functionArguments:[newTask]
      }
    }
 
    // hold the latest task.task_id from our local state
    const latestId = tasks.length > 0 ? parseInt(tasks[tasks.length - 1].task_id) + 1 : 1;
 
    // build a newTaskToPush object into our local state
    const newTaskToPush = {
      address: account.address,
      completed: false,
      content: newTask,
      task_id: latestId + "",
    };
 
    try {
      // sign and submit transaction to chain
      const response = await signAndSubmitTransaction(transaction);
      // wait for transaction
      await aptos.waitForTransaction({transactionHash:response.hash});
 
      // Create a new array based on current state:
      let newTasks = [...tasks];
 
      // Add item to the tasks array
      newTasks.push(newTaskToPush);
      // Set state
      setTasks(newTasks);
      // clear input text
      setNewTask("");
    } catch (error: any) {
      console.log("error", error);
    } finally {
      setTransactionInProgress(false);
    }
  };


  return (
    <>
      <Layout>
        <Row align="middle">
          <Col span={10} offset={2}>
            <h1>Our todolist</h1>
          </Col>
          <Col span={12} style={{ textAlign: "right", paddingRight: "200px" }}>
            <WalletSelector />
          </Col>
        </Row>
      </Layout>
      <Spin spinning={transactionInProgress}>
        {!accountHasList ? (
          <Row gutter={[0, 32]} style={{ marginTop: "2rem" }}>
            <Col span={8} offset={8}>
              <Button
                disabled={!account}
                block
                onClick={addNewList}
                type="primary"
                style={{ height: "40px", backgroundColor: "#3f67ff" }}
              >
                Add new list
              </Button>
            </Col>
          </Row>
        ) : (
          <>
            {/* Input field for adding a new task */}
            <Row gutter={[0, 32]} style={{ marginTop: "2rem" }}>
              <Col span={8} offset={8}>
                <Input.Group compact>
                  <Input
                    onChange={(event) => onWriteTask(event)}
                    style={{ width: "calc(100% - 60px)" }}
                    placeholder="Add a Task"
                    size="large"
                    value={newTask}
                  />
                  <Button
                    onClick={onTaskAdded}
                    type="primary"
                    style={{ height: "40px", backgroundColor: "#3f67ff" }}
                  >
                    Add
                  </Button>
                </Input.Group>
              </Col>
            </Row>

            {/* Task list display */}
            <Row gutter={[0, 32]} style={{ marginTop: "2rem" }}>
              <Col span={8} offset={8}>
                {tasks && (
                  <List
                    size="small"
                    bordered
                    dataSource={tasks}
                    renderItem={(task: any) => (
                      <List.Item actions={[<Checkbox />]}>
                        <List.Item.Meta
                          title={task.content}
                          description={
                            <a
                              href={`https://explorer.aptoslabs.com/account/${task.address}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {`${task.address.slice(0, 6)}...${task.address.slice(-5)}`}
                            </a>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Col>
            </Row>
          </>
        )}
      </Spin>
    </>
  );
}

const aptosConfig = new AptosConfig({ network: Network.MAINNET });
const aptos = new Aptos(aptosConfig);

export default App;
