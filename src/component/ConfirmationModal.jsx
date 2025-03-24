import { useState } from 'react';
import PropTypes from 'prop-types';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, taskIdentifier }) => {
  const [username, setUsername] = useState('');

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Confirmar Restart para {taskIdentifier}</h3>
        <input
          type="text"
          placeholder="Digite seu nome"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          aria-label="Nome do usuário"
        />
        <div className="modal-buttons">
          <button onClick={onClose} className="btn-cancel">
            Cancelar
          </button>
          <button 
            onClick={() => {
              onConfirm(username);
              setUsername('');
            }} 
            className="btn-confirm"
            disabled={!username.trim()}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

ConfirmationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  taskIdentifier: PropTypes.string.isRequired,
};

export default ConfirmationModal;