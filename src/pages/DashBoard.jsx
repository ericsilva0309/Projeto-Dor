import { useState, useEffect, useRef } from "react";
import { useAuth } from "react-oidc-context";
import { cognitoAuthConfig } from "../cognitoConfig";
import "./DashBoard.css";
import {
  MdOutlineKeyboardDoubleArrowLeft,
  MdOutlineKeyboardDoubleArrowRight,
} from "react-icons/md";
import TaskStatusModal from "../component/TaskStatusModal";

// URLs dos endpoints
const LAMBDA_STATUS_URL =
  "https://z6tgt17nud.execute-api.sa-east-1.amazonaws.com/dev/status";
const TEST_CONNECTION_URL =
  "https://z6tgt17nud.execute-api.sa-east-1.amazonaws.com/dev/test-connection";
const STEP_FUNCTION_URL =
  "https://z6tgt17nud.execute-api.sa-east-1.amazonaws.com/dev/invoke";

function DashBoard() {
  const auth = useAuth();

  // Estados principais
  const [tasks, setTasks] = useState([]);
  const tasksRef = useRef(tasks);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 8;

  // Estado para exibir o modal durante o teste de conexão
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    currentMessage: "",
    task: null,
  });

  // Mantém a referência das tasks atualizada
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Função auxiliar para realizar chamadas API e tratar erros
  const fetchJson = async (url, options = {}) => {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ${response.status}: ${errorText}`);
    }
    return response.json();
  };

  // ================================
  // FUNÇÕES DE API
  // ================================

  // Busca as tasks e adiciona o status da Step Function em cada uma
  const fetchTasks = async () => {
    try {
      const data = await fetchJson(LAMBDA_STATUS_URL);
      let tasksData =
        typeof data.body === "string" ? JSON.parse(data.body) : data.body;

      // Para cada task, consulta o status da Step Function
      const updatedTasks = await Promise.all(
        tasksData.map(async (task) => {
          const stepFnStatus = await fetchStepFunctionStatus(task);

          // Define as propriedades iniciais dos botões
          const connectionDisabled =
            !(task.Status === "failed" || task.Status === "stopped");
          const connectionClass = "btn-gray";
          const connectionText = "Conexão";
          const restartDisabled = stepFnStatus.toLowerCase() === "failed";

          return {
            ...task,
            connectionDisabled,
            connectionClass,
            connectionText,
            restartDisabled,
            stepFunctionStatus: stepFnStatus,
          };
        })
      );

      setTasks(updatedTasks);
    } catch (error) {
      alert("Erro ao buscar as tasks.");
      console.error(error);
    }
  };

  // Consulta o status da Step Function para uma task
  const fetchStepFunctionStatus = async (task) => {
    try {
      const response = await fetch(STEP_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_last_status",
          task_identifier: task.TaskIdentifier.toLowerCase(),
        }),
      });
      if (!response.ok) {
        // Se não houver registro, considera que a Step Function não foi acionada
        return "Não iniciada";
      }
      const data = await response.json();
      return data.status || "Desconhecido";
    } catch (error) {
      console.error("Erro ao buscar status da Step Function:", error);
      return "Não iniciada";
    }
  };

  // Testa a conexão de uma task e inicia o polling do status
  const testConnection = async (taskIndex) => {
    const task = tasks[taskIndex];

    // Abre o modal e exibe mensagem inicial
    setStatusModal({
      isOpen: true,
      currentMessage: `Iniciando teste de conexão para a task: ${task.TaskIdentifier}`,
      task,
    });

    try {
      // Obtém detalhes da task
      const taskDetails = await fetchJson(
        "https://z6tgt17nud.execute-api.sa-east-1.amazonaws.com/dev/get-task-details",
        {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskIdentifier: task.TaskIdentifier }),
        }
      );
      const taskArn = taskDetails.ReplicationInstanceArn;
      const endpointArn =
        taskDetails.SourceEndpointArn || taskDetails.TargetEndpointArn;
      if (!taskArn || !endpointArn)
        throw new Error("Erro: ARN não encontrados.");

      setStatusModal((prev) => ({
        ...prev,
        currentMessage: "Detalhes da task obtidos.",
      }));

      // Inicia o teste de conexão
      await fetchJson(TEST_CONNECTION_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start-test",
          task_arn: taskArn,
          endpoint_arn: endpointArn,
        }),
      });

      // Desabilita o botão de conexão e inicia o polling do status
      updateTask(task.TaskIdentifier, { connectionDisabled: true });
      await pollConnectionStatus(task, taskArn, endpointArn);
    } catch (error) {
      alert(error.message);
      console.error(error);
      setStatusModal((prev) => ({
        ...prev,
        currentMessage: `Erro: ${error.message}`,
      }));
    }
  };

  // Faz o polling do status do teste de conexão até que ele saia do estado "testing"
  const pollConnectionStatus = async (task, taskArn, endpointArn) => {
    let status = "testing";
    while (status === "testing") {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      try {
        const result = await fetchJson(TEST_CONNECTION_URL, {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "check-test",
            task_arn: taskArn,
            endpoint_arn: endpointArn,
          }),
        });
        status = result.status;
        setStatusModal((prev) => ({
          ...prev,
          currentMessage: `Status atual: ${status}`,
        }));
      } catch (error) {
        console.error("Erro ao verificar status de conexão:", error);
        status = "failed";
      }
    }

    alert(`Teste finalizado: ${status}`);
    setStatusModal((prev) => ({
      ...prev,
      currentMessage: `Teste finalizado: ${status}`,
    }));

    // Atualiza as propriedades do botão conforme o resultado do teste
    const normalizedStatus = status.toLowerCase().trim();
    const newProps = { connectionDisabled: false };

    if (normalizedStatus === "successful") {
      newProps.connectionClass = "btn-green";
      newProps.connectionText = "Conexão (OK)";
      newProps.restartDisabled = task.Status === "running";
    } else if (normalizedStatus === "failed") {
      newProps.connectionClass = "btn-red";
      newProps.connectionText = "Conexão (Falha)";
      newProps.restartDisabled = true;
    }
    updateTask(task.TaskIdentifier, newProps);
  };

  // Invoca a Step Function para reiniciar uma task
  const invokeStepFunction = async (taskIndex) => {
    const task = tasks[taskIndex];
    try {
      const data = await fetchJson(STEP_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_identifier: task.TaskIdentifier }),
      });
      updateTask(task.TaskIdentifier, {
        stepFunctionStatus: data.executionArn ? "Executando" : "Não acionada",
        executionArn: data.executionArn,
      });
    } catch (error) {
      alert("Erro ao invocar a Step Function.");
      console.error(error);
    }
  };

  // Checa periodicamente o status da Step Function para as tasks que possuem executionArn
  const checkStepFunctionStatus = async () => {
    const currentTasks = tasksRef.current;
    const updatedTasks = await Promise.all(
      currentTasks.map(async (task) => {
        if (!task.executionArn) return task;
        try {
          const data = await fetchJson(STEP_FUNCTION_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              executionArn: task.executionArn,
              task_identifier: task.TaskIdentifier,
            }),
          });
          if (data.status) {
            return { ...task, stepFunctionStatus: data.status };
          }
        } catch (error) {
          console.error("Erro ao verificar status da Step Function:", error);
        }
        return task;
      })
    );
    setTasks(updatedTasks);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      checkStepFunctionStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Atualiza a task identificada pelo TaskIdentifier com novas propriedades
  const updateTask = (taskIdentifier, newProps) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.TaskIdentifier === taskIdentifier
          ? { ...task, ...newProps }
          : task
      )
    );
  };

  // ================================
  // FUNÇÕES DE APOIO
  // ================================

  // Retorna o estilo CSS conforme o status da task
  const getStatusStyle = (task) => {
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
  };

  // Retorna um array com os números de páginas para a paginação
  const getPageNumbers = (currentPage, totalPages, maxVisible = 7) => {
    let pages = [];
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        pages = [1, 2, 3, 4, 5, "...", totalPages];
      } else if (currentPage >= totalPages - 3) {
        pages = [
          1,
          "...",
          totalPages - 4,
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages,
        ];
      } else {
        pages = [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
      }
    }
    return pages;
  };

  // Trata o sign out
  const handleSignOut = async () => {
    try {
      console.log("Iniciando signout...");
      await auth.signoutRedirect({
        client_id: cognitoAuthConfig.client_id,
      });
    } catch (error) {
      console.error("Erro durante o signout:", error);
    }
  };

  // ================================
  // CÁLCULOS PARA PAGINAÇÃO
  // ================================
  const filteredTasks = tasks.filter((task) =>
    task.TaskIdentifier.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const indexOfLastTask = currentPage * tasksPerPage;
  const indexOfFirstTask = indexOfLastTask - tasksPerPage;
  const currentTasks = filteredTasks.slice(indexOfFirstTask, indexOfLastTask);
  const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);

  // ================================
  // RENDERIZAÇÃO DO COMPONENTE
  // ================================
  return (
    <div className="container">
      <header className="header" role="banner">
        <img className="logo" src="/image.png" alt="Logotipo Flowhub" />
        <h1>Status das Tasks Flowhub</h1>
        <img
          className="perfil"
          src="/perfil.png"
          alt="Imagem do perfil"
          onClick={handleSignOut}
          title="Clique para sair"
        />
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
        <button
          id="update-button"
          onClick={fetchTasks}
          aria-label="Atualizar status das tasks"
        >
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
        {statusModal.isOpen && (
          <TaskStatusModal
            task={statusModal.task}
            currentMessage={statusModal.currentMessage}
            onClose={() =>
              setStatusModal({ isOpen: false, currentMessage: "", task: null })
            }
          />
        )}
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
        {getPageNumbers(currentPage, totalPages).map((page, idx) =>
          page === "..." ? (
            <span key={`ellipsis-${idx}`} className="ellipsis" aria-hidden="true">
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

export default DashBoard;
