import PropTypes from "prop-types";
import { useState } from "react";
import "./TaskStatusModal.css";

function TaskStatusModal({ task, currentMessage, onClose, onConfirm }) {
  // Estado para armazenar o nome digitado
  const [username, setUsername] = useState("");
  // Se task for nulo, retorna null para evitar erros
  if (!task) return null;


  // Função para lidar com o clique de confirmar
  const handleConfirm = () => {
    if (username.trim() === "") {
      alert("Por favor, informe seu nome.");
      return;
    }
    // Chama a função onConfirm passando o nome digitado
    onConfirm(username);
  };

  return (
    <div className="modal2-overlay">
      <div className="modal2">
        <header className="modal2-header">
          <h2>
            Reiniciar Task:
            <br />
            {task.TaskIdentifier}
          </h2>
          <button type="button" onClick={onClose} aria-label="Fechar modal">
            X
          </button>
        </header>
        <div className="modal2-content">
          <p>{currentMessage}</p>
          <input
            type="text"
            placeholder="Digite seu nome"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <footer className="modal2-footer">
          <button onClick={handleConfirm}>Confirmar</button>
          <button onClick={onClose}>Cancelar</button>
        </footer>
      </div>
    </div>
  );
}

TaskStatusModal.propTypes = {
  task: PropTypes.shape({
    TaskIdentifier: PropTypes.string.isRequired,
  }).isRequired,
  currentMessage: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default TaskStatusModal;
