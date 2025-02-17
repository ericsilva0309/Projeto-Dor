import PropTypes from "prop-types";
import "./TaskStatusModal.css";

function TaskStatusModal({ task, currentMessage, onClose }) {
  // Se task for nulo, retorne null para evitar erros
  if (!task) return null;

  return (
    <div className="modal2-overlay">
      <div className="modal2">
        <header className="modal2-header">
          <h2>Teste de Conexão:<br />
            {task.TaskIdentifier}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar modal">
            X
          </button>
        </header>
        <div className="modal2-content">
            <p>{currentMessage}</p>
        </div>
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
};

export default TaskStatusModal;
