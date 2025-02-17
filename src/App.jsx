import { useState, useEffect, useRef } from "react";
import "./App.css";
import {
  MdOutlineKeyboardDoubleArrowLeft,
  MdOutlineKeyboardDoubleArrowRight,
} from "react-icons/md";
import TaskStatusModal from "./component/TaskStatusModal"; // Certifique-se do nome do arquivo!

const lambdaStatusUrl =
  "https://z6tgt17nud.execute-api.sa-east-1.amazonaws.com/dev/status";
const testConnectionLambdaUrl =
  "https://z6tgt17nud.execute-api.sa-east-1.amazonaws.com/dev/test-connection";
const stepFunctionUrl =
  "https://z6tgt17nud.execute-api.sa-east-1.amazonaws.com/dev/invoke";

function App() {
  const [tasks, setTasks] = useState([]);
  const tasksRef = useRef(tasks);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 8;

  // Estado para controlar o modal de teste de conexão
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    currentMessage: "",
    task: null,
  });

  // Atualiza a referência das tasks sempre que elas mudam
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Função para buscar as tasks
  async function fetchTasks() {
    try {
      const response = await fetch(lambdaStatusUrl);
      const data = await response.json();
      let tasksData =
        typeof data.body === "string" ? JSON.parse(data.body) : data.body;
      tasksData = tasksData.map((task) => {
        let connectionDisabled = true;
        let connectionClass = "btn-gray";
        let restartDisabled = true;
        let connectionText = "Conexão";

        if (task.Status === "running") {
          connectionDisabled = true;
          connectionClass = "btn-green";
        } else if (task.Status === "ready") {
          connectionDisabled = true;
          connectionClass = "btn-gray";
        } else if (task.Status === "failed") {
          connectionDisabled = false;
          connectionClass = "btn-gray";
        } else if (task.Status === "stopped") {
          connectionDisabled = false;
          connectionClass = "btn-gray";
        }
        return {
          ...task,
          connectionDisabled,
          connectionClass,
          connectionText,
          restartDisabled,
          stepFunctionStatus: "Não acionada",
        };
      });
      setTasks(tasksData);
    } catch (error) {
      alert("Erro ao buscar as tasks.");
      console.error(error);
    }
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  // Função para testar a conexão de uma task
  async function testConnection(taskIndex) {
    const task = tasks[taskIndex];

    // Abre o modal e inicia as mensagens
    setStatusModal({
      isOpen: true,
      currentMessage: `Iniciando teste de conexão para a task: ${task.TaskIdentifier}`,
      task,
    });

    try {
      const taskResponse = await fetch(
        "https://z6tgt17nud.execute-api.sa-east-1.amazonaws.com/dev/get-task-details",
        {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskIdentifier: task.TaskIdentifier }),
        }
      );
      if (!taskResponse.ok)
        throw new Error("Erro ao obter detalhes da task.");
      const taskData = await taskResponse.json();
      const taskArn = taskData.ReplicationInstanceArn;
      const endpointArn =
        taskData.SourceEndpointArn || taskData.TargetEndpointArn;
      if (!taskArn || !endpointArn)
        throw new Error("Erro: ARN não encontrados.");

      setStatusModal((prev) => ({
        ...prev,
        currentMessage: "Detalhes da task obtidos.",
      }));

      const payload = {
        action: "start-test",
        task_arn: taskArn,
        endpoint_arn: endpointArn,
      };
      const response = await fetch(testConnectionLambdaUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Erro ao iniciar o teste.");

      // Desabilita o botão de conexão enquanto o teste é realizado
      updateTask(taskIndex, { connectionDisabled: true });
      await checkConnectionStatus(task, taskIndex, taskArn, endpointArn);
    } catch (error) {
      alert(error.message);
      console.error(error);
      setStatusModal((prev) => ({
        ...prev,
        currentMessage: `Erro: ${error.message}`,
      }));
    }
  }

  // Função para checar o status do teste de conexão
  async function checkConnectionStatus(task, taskIndex, taskArn, endpointArn) {
    let status = "testing";
    while (status === "testing") {
      await new Promise((resolve) => setTimeout(resolve, 10000)); // aguarda 10s
      const response = await fetch(testConnectionLambdaUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check-test",
          task_arn: taskArn,
          endpoint_arn: endpointArn,
        }),
      });
      const result = await response.json();
      status = result.status;
      setStatusModal((prev) => ({
        ...prev,
        currentMessage: `Status atual: ${status}`,
      }));
    }
    alert(`Teste finalizado: ${status}`);
    setStatusModal((prev) => ({
      ...prev,
      currentMessage: `Teste finalizado: ${status}`,
    }));
    const normalizedStatus = status.toLowerCase().trim();
    const currentTask = tasks[taskIndex];

    const newProps = {};
    if (normalizedStatus === "successful") {
      if (currentTask.Status === "failed" || currentTask.Status === "stopped") {
        newProps.connectionClass = "btn-green";
        newProps.connectionText = "Conexão (OK)";
        newProps.restartDisabled = false;
      } else if (currentTask.Status === "running") {
        newProps.connectionClass = "btn-green";
        newProps.connectionText = "Conexão (OK)";
        newProps.restartDisabled = true;
      }
    } else if (normalizedStatus === "failed") {
      newProps.connectionClass = "btn-red";
      newProps.connectionText = "Conexão (Falha)";
      newProps.restartDisabled = true;
    }
    newProps.connectionDisabled = false;
    updateTask(taskIndex, newProps);
  }

  // Função para invocar a Step Function
  async function invokeStepFunction(taskIndex) {
    const task = tasks[taskIndex];
    const payload = { task_identifier: task.TaskIdentifier };
    try {
      const response = await fetch(stepFunctionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      updateTask(taskIndex, {
        stepFunctionStatus: data.executionArn ? "Executando" : "Não acionada",
        executionArn: data.executionArn,
      });
    } catch (error) {
      alert("Erro ao invocar a Step Function.");
      console.error(error);
    }
  }

  // Atualiza uma task específica no estado
  function updateTask(index, newProps) {
    const updatedTasks = [...tasks];
    updatedTasks[index] = { ...updatedTasks[index], ...newProps };
    setTasks(updatedTasks);
  }

  // Checa periodicamente o status da Step Function
  async function checkStepFunctionStatus() {
    const currentTasks = tasksRef.current;
    const updatedTasks = [...currentTasks];
    for (let i = 0; i < updatedTasks.length; i++) {
      const task = updatedTasks[i];
      if (!task.executionArn) continue;
      try {
        const response = await fetch(stepFunctionUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ executionArn: task.executionArn }),
        });
        const data = await response.json();
        if (data.status) {
          const finalStatuses = ["succeeded", "failed", "aborted"];
          if (finalStatuses.includes(data.status.toLowerCase())) {
            updatedTasks[i].stepFunctionStatus = "Não acionada";
          } else {
            updatedTasks[i].stepFunctionStatus = data.status;
          }
        }
      } catch (error) {
        console.error("Erro ao verificar status da Step Function:", error);
      }
    }
    setTasks(updatedTasks);
  }

  useEffect(() => {
    const interval = setInterval(() => {
      checkStepFunctionStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Função para definir o estilo visual do status
  function getStatusStyle(task) {
    if (task.Status === "running" && task.MigrationProgress === 100) {
      return {
        background: "linear-gradient(to right, #0fa835, #16ca52)",
        color: "white",
        fontWeight: "bold",
        borderRadius: "4px",
        padding: "12px 2px",
        border: "2px solid #0fa835",
      };
    } else if (task.Status === "failed") {
      return {
        background: "linear-gradient(to right, #b4210e, #da0f0f)",
        color: "white",
        fontWeight: "bold",
        borderRadius: "4px",
        padding: "12px 2px",
        border: "2px solid #791305",
      };
    } else if (task.Status === "running") {
      return {
        background: "linear-gradient(to right, #0ebb90, #13e4b0)",
        color: "white",
        fontWeight: "bold",
        borderRadius: "4px",
        padding: "12px 2px",
        border: "2px solid #0fbe89",
      };
    } else if (task.Status === "ready" || task.Status === "stopped") {
      return {
        background: "linear-gradient(to right, #cecece, #e9e9e9)",
        color: "#5a5a5a",
        fontWeight: "bold",
        borderRadius: "4px",
        padding: "12px 2px",
        border: "2px solid #cecece",
      };
    }
    return {};
  }

  function getPageNumbers(currentPage, totalPages, maxVisible = 7) {
    let pages = [];
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        pages = [1, 2, 3, 4, 5, "...", totalPages];
      } else if (currentPage >= totalPages - 3) {
        pages = [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
      } else {
        pages = [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
      }
    }
    return pages;
  }

  const filteredTasks = tasks.filter((task) =>
    task.TaskIdentifier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastTask = currentPage * tasksPerPage;
  const indexOfFirstTask = indexOfLastTask - tasksPerPage;
  const currentTasks = filteredTasks.slice(indexOfFirstTask, indexOfLastTask);
  const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);

  return (
    <div className="container">
      <header className="header" role="banner">
        <img className="logo" src="/image.png" alt="Logotipo Flowhub" />
        <h1>Status das Tasks Flowhub</h1>
        <img className="perfil" src="/perfil.png" alt="Imagem do perfil" />
      </header>
      <div className="search-update-container">
        <div className="search-input-wrapper">
          <span className="search-icon" aria-hidden="true">
            <img src="/search.png" alt="Pesquisar" />
          </span>
          <input
            type="text"
            placeholder="Pesquisar task..."
            aria-label="Pesquisar task"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <button id="update-button" onClick={fetchTasks} aria-label="Atualizar status das tasks">
          Atualizar Status
        </button>
      </div>
      <div className="task-list">
        <div className="task-row task-row-header">
          <div className="task-cell task-name">TASKS</div>
          <div className="task-cell">STATUS</div>
          <div className="task-cell-connection">CONEXÃO</div>
          <div className="task-cell-restart">RESTART</div>
          <div className="task-cell">STEP FUNCTION</div>
        </div>

        {/* Modal de Teste de Conexão */}
        {statusModal.isOpen && (
          <TaskStatusModal
            task={statusModal.task}
            currentMessage={statusModal.currentMessage}
            onClose={() =>
              setStatusModal({ isOpen: false, currentMessage: "", task: null })
            }
          />
        )}

        {/* Lista de tasks */}
        {currentTasks.map((task, index) => (
          <div key={task.TaskIdentifier} className="task-row">
            <div className="task-cell task-namee">{task.TaskIdentifier}</div>
            <div className="task-cell" style={getStatusStyle(task)}>
              {task.Status}
            </div>
            <div className="task-cell-connection">
              <button
                onClick={() => testConnection(index + indexOfFirstTask)}
                disabled={task.connectionDisabled}
                className={task.connectionClass}
                aria-label={`Testar conexão para a task ${task.TaskIdentifier}`}
              >
                {task.connectionText || "Conexão"}
              </button>
            </div>
            <div className="task-cell-restart">
              <button
                onClick={() => invokeStepFunction(index + indexOfFirstTask)}
                disabled={task.restartDisabled}
                aria-label={`Reiniciar task ${task.TaskIdentifier}`}
              >
                Restart
              </button>
            </div>
            <div className="task-stepFunction">{task.stepFunctionStatus}</div>
          </div>
        ))}
      </div>

      <div className="pagination-container">
        <button
          className="arrow-button"
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Página anterior"
        >
          <MdOutlineKeyboardDoubleArrowLeft size={12} />
        </button>

        {getPageNumbers(currentPage, totalPages).map((page, index) =>
          page === "..." ? (
            <span key={`ellipsis-${index}`} className="ellipsis" aria-hidden="true">
              {page}
            </span>
          ) : (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={currentPage === page ? "active-page" : ""}
              aria-label={`Ir para página ${page}`}
            >
              {page}
            </button>
          )
        )}

        <button
          className="arrow-button"
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Próxima página"
        >
          <MdOutlineKeyboardDoubleArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}

export default App;
