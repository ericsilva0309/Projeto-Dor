Segue uma sugestão de README.md para o projeto:

---
# Flowhub Tasks Dashboard

Um dashboard responsivo para monitoramento das tasks do sistema Flowhub. A aplicação foi desenvolvida em React e permite visualizar o status das tasks, testar conexões, reiniciar tasks via Step Function e navegar entre as páginas com recursos de busca e paginação dinâmica.

## Tabela de Conteúdos

- [Visão Geral](#visão-geral)
- [Recursos](#recursos)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Instalação](#instalação)
- [Uso](#uso)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Endpoints da API](#endpoints-da-api)

## Visão Geral

O Flowhub Tasks Dashboard é uma aplicação web desenvolvida com React que tem como objetivo:
- Buscar e exibir informações das tasks do Flowhub a partir de um endpoint.
- Permitir que o usuário teste a conexão de uma task e veja seu status em tempo real.
- Invocar uma Step Function para reiniciar ou atualizar as tasks conforme necessário.
- Oferecer um mecanismo de busca e paginação para facilitar a navegação, mesmo quando o número de tasks é elevado.

## Recursos

- **Exibição de Tasks:** Mostra o status atual de cada task (e.g., running, ready, failed, stopped) com um design diferenciado.
- **Teste de Conexão:** Permite iniciar um teste de conexão para cada task e atualizar os botões conforme o resultado.
- **Step Function:** Permite reiniciar ou acionar processos de tasks via Step Function.
- **Busca e Paginação:** Filtra tasks com base no identificador e utiliza paginação dinâmica.
- **Responsividade:** Layout adaptado diefrentes tipo

## Tecnologias Utilizadas

- **React:** Biblioteca JavaScript para construção de interfaces.
- **CSS:** Estilização customizada para layout e responsividade.
- **React Icons:** Ícones utilizados na interface (ex.: setas de navegação).

## Instalação

Para executar o projeto localmente, siga os passos abaixo:

1. **Clone o repositório:**

   ```bash
   git clone https://github.com/ericsilva0309/Projeto-Dor.git
   ```

3. **Instale as dependências:**

   ```bash
   npm install
   ```

4. **Inicie o servidor de desenvolvimento:**

   ```bash
   npm run dev
   ```

## Uso

- **Atualizar Tasks:** Clique no botão "Atualizar Status" para buscar os dados atualizados das tasks.
- **Pesquisar:** Utilize o campo de busca para filtrar as tasks pelo identificador.
- **Teste de Conexão:** Clique no botão "Conexão" para iniciar o teste de conexão da task correspondente.
- **Restart (Step Function):** Utilize o botão "Restart" para invocar a Step Function e reiniciar a task.
- **Paginação:** Navegue entre as páginas utilizando as setas e os botões numéricos gerados dinamicamente.

## Estrutura do Projeto

A estrutura principal do projeto inclui:

- **App.js:** Componente principal que gerencia o estado, a lógica de negócios (busca, teste de conexão, invocação de step function) e a renderização da interface.
- **App.css:** Arquivo de estilos responsável pela aparência e responsividade do dashboard.
- **Endpoints:** Constantes definidas no início do App.js para integração com a API (status, teste de conexão e step function).
