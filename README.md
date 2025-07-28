ProjectFlow é uma aplicação web moderna e completa para gerenciamento de projetos, projetada para equipes que buscam organizar, planejar e executar seu trabalho de forma eficiente. Construída com uma stack de tecnologias de ponta, a plataforma oferece uma experiência de usuário fluida e colaboração em tempo real.

![Screenshot do Quadro Kanban](https://imgur.com/a/7pNaZPs)
---

## ✨ Funcionalidades Principais

*   **Gerenciamento de Projetos:** Crie e organize múltiplos projetos em um dashboard central.
*   **Quadro Kanban & Lista de Tarefas:** Visualize e gerencie tarefas com um quadro de arrastar e soltar ou uma lista detalhada com ordenação e filtros.
*   **Planejamento de Arquitetura:**
    *   **Módulos:** Agrupe tarefas e documentação em unidades funcionais (ex: "Autenticação", "Pagamentos").
    *   **Modelo de Dados:** Defina as entidades do seu sistema e seus relacionamentos.
*   **Colaboração em Tempo Real:**
    *   **Membros e Papéis:** Convide membros para seus projetos com diferentes níveis de permissão (`owner`, `editor`, `viewer`).
    *   **Notificações:** Seja notificado sobre convites, atribuições de tarefas e menções.
*   **Controle de Tempo:** Inicie e pause um cronômetro em cada tarefa para registrar o tempo trabalhado.
*   **Design Moderno:** Interface limpa, responsiva e com temas claro e escuro.

---

## 🛠️ Tecnologias Utilizadas

*   **Frontend:** React 18, TypeScript, Vite
*   **Estilização:** Tailwind CSS
*   **Backend & Banco de Dados:** Firebase (Authentication, Firestore, Storage)
*   **Roteamento:** React Router
*   **Gerenciamento de Formulários:** React Hook Form com Zod
*   **Animações:** Framer Motion
*   **Componentes Adicionais:** Lucide React (ícones), React Quill (editor de texto)

---

## 🚀 Como Executar o Projeto Localmente

Siga os passos abaixo para configurar e rodar o projeto na sua máquina.

### Pré-requisitos

*   [Node.js](https://nodejs.org/) (versão 18 ou superior)
*   [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)
*   Uma conta no [Firebase](https://firebase.google.com/)

### Configuração

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/seu-usuario/projectflow.git
    cd projectflow
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configure as variáveis de ambiente:**
    *   Crie um arquivo chamado `.env.local` na raiz do projeto.
    *   Adicione suas credenciais do Firebase a este arquivo, com o prefixo `VITE_`. Você pode encontrar essas credenciais nas configurações do seu projeto no Firebase.
    ```env
    VITE_FIREBASE_API_KEY="SUA_API_KEY_AQUI"
    VITE_FIREBASE_AUTH_DOMAIN="SEU_AUTH_DOMAIN_AQUI"
    VITE_FIREBASE_PROJECT_ID="SEU_PROJECT_ID_AQUI"
    VITE_FIREBASE_STORAGE_BUCKET="SEU_STORAGE_BUCKET_AQUI"
    VITE_FIREBASE_MESSAGING_SENDER_ID="SEU_MESSAGING_SENDER_ID_AQUI"
    VITE_FIREBASE_APP_ID="SEU_APP_ID_AQUI"
    ```

### Executando

1.  **Inicie o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```

2.  Abra seu navegador e acesse `http://localhost:5173` (ou a porta indicada no terminal).

---

##  Roadmap Futuro

*   [ ] Feed de Atividades do Projeto
*   [ ] Funcionalidades nos módulos
*   [ ] Fluxos
*   [ ] Busca Global
*   [ ] Dependências de Tarefas

---

Criado com ❤️ e código.