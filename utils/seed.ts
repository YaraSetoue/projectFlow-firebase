
import { User, Attribute, RelationshipType, Member, MemberRole, Task, TaskStatus } from '../types';
import { Timestamp } from '@firebase/firestore';

// Helper to generate simple random IDs for mock data
const generateId = (prefix: string) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`;

interface SeedMember extends User {
    role: MemberRole;
}

const getFutureDate = (days: number): Timestamp => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return Timestamp.fromDate(date);
};

export const getSeedData = (currentUser: User) => {
    // 1. Define mock users and members
    const createMember = (uid: string, name: string, email: string, role: MemberRole): SeedMember => ({
        uid,
        email,
        displayName: name,
        photoURL: `https://i.pravatar.cc/150?u=${email}`,
        role,
        activeTimer: null
    });
    
    const ownerMember = createMember(currentUser.uid, currentUser.displayName || 'Proprietário', currentUser.email!, 'owner');
    const aliceMember = createMember(generateId('user_alice'), 'Alice Silva', 'alice@example.com', 'editor');
    const bobMember = createMember(generateId('user_bob'), 'Beto Souza', 'beto@example.com', 'editor');
    const carolMember = createMember(generateId('user_carol'), 'Carolina Dias', 'carol@example.com', 'viewer');

    const mockUsers = [
        { uid: aliceMember.uid, email: aliceMember.email, displayName: aliceMember.displayName, photoURL: aliceMember.photoURL },
        { uid: bobMember.uid, email: bobMember.email, displayName: bobMember.displayName, photoURL: bobMember.photoURL },
        { uid: carolMember.uid, email: carolMember.email, displayName: carolMember.displayName, photoURL: carolMember.photoURL },
    ];
    
    const allMembers = [ownerMember, aliceMember, bobMember, carolMember];
    
    // 2. Define Project data
    const projectData = {
        name: 'Plataforma de E-commerce',
        description: 'Um projeto de exemplo que define a arquitetura completa para uma plataforma de e-commerce moderna, incluindo módulos, um modelo de dados e histórias de usuário como tarefas.',
        ownerId: currentUser.uid,
        members: allMembers.reduce((acc, member) => {
            acc[member.uid] = member.role;
            return acc;
        }, {} as { [key: string]: MemberRole }),
        memberUids: allMembers.map(m => m.uid),
    };

    // 3. Define Modules
    const modulesData = [
        {
            name: "Gerenciamento de Usuários",
            description: "Lida com registro, login e perfis de usuário.",
            icon: "users",
            color: "blue",
            documentation: "<h2>Autenticação e Autorização</h2><p>Utiliza autenticação JWT com tokens de curta duração e refresh tokens. A senha do usuário deve ser hasheada com <strong>bcrypt</strong> antes de ser armazenada no banco de dados.</p><ul><li>Endpoint de registro: <code>POST /api/auth/register</code></li><li>Endpoint de login: <code>POST /api/auth/login</code></li></ul>"
        },
        {
            name: "Catálogo de Produtos",
            description: "Exibição, busca e filtragem de produtos.",
            icon: "database",
            color: "purple",
            documentation: "<h2>Busca de Produtos</h2><p>A busca será implementada com um serviço externo como <strong>Algolia</strong> ou <strong>Elasticsearch</strong> para garantir alta performance e recursos avançados de filtragem. A API interna deve ser agnóstica a essa implementação. A indexação deve ser atualizada sempre que um produto for criado ou alterado.</p>"
        },
        {
            name: "Carrinho de Compras e Checkout",
            description: "Toda a lógica do carrinho de compras e integração com gateway de pagamento.",
            icon: "shield",
            color: "green",
            documentation: "<h2>Gateway de Pagamento</h2><p>O gateway de pagamento a ser utilizado será o <strong>Stripe</strong>. A integração deve seguir as melhores práticas de segurança, como a utilização do Payment Intents API para processar pagamentos no lado do servidor, evitando a exposição de dados sensíveis no cliente.</p>"
        },
    ];

    // 4. Define Entities
    const entitiesData: { name: string, description: string, attributes: Attribute[] }[] = [
        {
            name: "Usuário",
            description: "Representa um cliente ou administrador no sistema.",
            attributes: [
                { id: 'user_attr_1', name: 'id', dataType: 'ID', isRequired: true, description: 'Identificador único do usuário.' },
                { id: 'user_attr_2', name: 'nome', dataType: 'String', isRequired: true, description: 'Nome completo do usuário.' },
                { id: 'user_attr_3', name: 'email', dataType: 'String', isRequired: true, description: 'E-mail único para login.' },
                { id: 'user_attr_4', name: 'hashSenha', dataType: 'String', isRequired: true, description: 'Senha criptografada.' },
                { id: 'user_attr_5', name: 'endereco', dataType: 'String', isRequired: false, description: 'Endereço de entrega.' },
            ]
        },
        {
            name: "Produto",
            description: "Representa um item disponível para venda.",
            attributes: [
                { id: 'prod_attr_1', name: 'id', dataType: 'ID', isRequired: true, description: 'Identificador único do produto.' },
                { id: 'prod_attr_2', name: 'nome', dataType: 'String', isRequired: true, description: 'Nome de exibição do produto.' },
                { id: 'prod_attr_3', name: 'descricao', dataType: 'String', isRequired: false, description: 'Descrição detalhada do produto.' },
                { id: 'prod_attr_4', name: 'preco', dataType: 'Number', isRequired: true, description: 'Preço em centavos.' },
                { id: 'prod_attr_5', name: 'estoque', dataType: 'Number', isRequired: true, description: 'Quantidade disponível.' },
            ]
        },
         {
            name: "Pedido",
            description: "Representa uma compra feita por um usuário.",
            attributes: [
                { id: 'order_attr_1', name: 'id', dataType: 'ID', isRequired: true, description: 'Identificador único do pedido.' },
                { id: 'order_attr_2', name: 'usuarioId', dataType: 'ID', isRequired: true, description: 'Chave estrangeira para o Usuário.' },
                { id: 'order_attr_3', name: 'status', dataType: 'String', isRequired: true, description: 'Ex: pendente, pago, enviado, entregue.' },
                { id: 'order_attr_4', name: 'valorTotal', dataType: 'Number', isRequired: true, description: 'Preço total do pedido em centavos.' },
                { id: 'order_attr_5', name: 'criadoEm', dataType: 'Date', isRequired: true, description: 'Timestamp da criação do pedido.' },
            ]
        }
    ];

    // 5. Define Relationships
    const relationshipsData: { sourceEntityName: string, targetEntityName: string, type: RelationshipType, description: string }[] = [
        {
            sourceEntityName: "Usuário",
            targetEntityName: "Pedido",
            type: "One to Many",
            description: "Um usuário pode ter vários pedidos"
        },
        {
            sourceEntityName: "Pedido",
            targetEntityName: "Produto",
            type: "Many to Many",
            description: "Um pedido pode conter vários produtos (através de uma tabela de junção)"
        }
    ];
    
    const userSummary = (member: SeedMember) => ({ uid: member.uid, displayName: member.displayName, photoURL: member.photoURL });
    
    // 6. Define Task Categories
    const taskCategoriesData = [
        { id: 'bug_cat', name: 'Bug', color: 'red', icon: 'bug', requiresTesting: true },
        { id: 'feature_cat', name: 'Feature', color: 'blue', icon: 'zap', requiresTesting: true },
        { id: 'chore_cat', name: 'Chore', color: 'gray', icon: 'settings', requiresTesting: false },
    ];

    // 7. Define Tasks, linked to modules by name
    const tasksData: (Pick<Task, 'title' | 'description' | 'status' | 'assignee' | 'commentsCount' | 'timeLogs'> & { moduleName: string; categoryName: string, dueDate?: Timestamp })[] = [
        {
            moduleName: "Gerenciamento de Usuários",
            title: "Implementar endpoint de registro com hash de senha",
            description: "Criar a rota POST /api/auth/register que valida os dados do usuário, hasheia a senha com bcrypt e salva no banco de dados.",
            status: 'done',
            assignee: userSummary(aliceMember),
            commentsCount: 1,
            timeLogs: [],
            categoryName: 'Feature',
            dueDate: getFutureDate(-5), // Overdue but done
        },
        {
            moduleName: "Gerenciamento de Usuários",
            title: "Desenvolver fluxo de login com JWT",
            description: "Criar a rota POST /api/auth/login que verifica as credenciais e retorna um JSON Web Token (JWT) em caso de sucesso.",
            status: 'inprogress',
            assignee: userSummary(aliceMember),
            commentsCount: 0,
            timeLogs: [],
            categoryName: 'Feature',
            dueDate: getFutureDate(3),
        },
        {
            moduleName: "Catálogo de Produtos",
            title: "Desenvolver API de busca de produtos (com paginação)",
            description: "Criar a rota GET /api/products que permite buscar produtos com filtros e paginação.",
            status: 'inprogress',
            assignee: userSummary(bobMember),
            commentsCount: 1,
            timeLogs: [],
            categoryName: 'Feature',
            dueDate: getFutureDate(-1), // Overdue
        },
        {
            moduleName: "Catálogo de Produtos",
            title: "Configurar indexação de produtos no Algolia",
            description: "Criar um script para sincronizar o banco de dados de produtos com o índice do Algolia. Isso não requer teste de QA formal.",
            status: 'inprogress',
            assignee: userSummary(bobMember),
            commentsCount: 0,
            timeLogs: [],
            categoryName: 'Chore',
            dueDate: getFutureDate(10),
        },
        {
            moduleName: "Carrinho de Compras e Checkout",
            title: "Modelar API do carrinho de compras",
            description: "Definir os endpoints para adicionar, remover e visualizar itens no carrinho. O estado do carrinho pode ser salvo no backend ou no cliente.",
            status: 'todo',
            assignee: userSummary(carolMember),
            commentsCount: 0,
            timeLogs: [],
            categoryName: 'Feature',
            dueDate: getFutureDate(15),
        },
        {
            moduleName: "Carrinho de Compras e Checkout",
            title: "Integrar API do Stripe para pagamentos",
            description: "Implementar o fluxo de checkout usando a API Payment Intents do Stripe para processar pagamentos de forma segura.",
            status: 'todo',
            assignee: userSummary(ownerMember),
            commentsCount: 0,
            timeLogs: [],
            categoryName: 'Feature',
        },
        {
            moduleName: "Gerenciamento de Usuários",
            title: "Escrever documentação para a API de Auth",
            description: "Documentar os endpoints de registro e login, incluindo os payloads esperados e as respostas.",
            status: 'todo',
            assignee: null,
            commentsCount: 0,
            timeLogs: [],
            categoryName: 'Chore',
        }
    ];

    // 8. Define Comments, linked by array index to tasksData
    const commentsData = [
        {
            taskId: 0, // Implementar endpoint de registro
            comments: [
                {
                    author: userSummary(ownerMember),
                    content: "Ótimo trabalho, Alice! Testei e está funcionando perfeitamente."
                }
            ]
        },
        {
            taskId: 2, // Desenvolver API de busca de produtos
            comments: [
                {
                    author: userSummary(aliceMember),
                    content: "Beto, podemos discutir a estrutura de paginação? Acho que usar cursores seria mais eficiente do que offset/limit."
                }
            ]
        }
    ];

    return {
        projectData,
        modulesData,
        entitiesData,
        relationshipsData,
        tasksData,
        mockUsers,
        commentsData,
        taskCategoriesData,
    };
};
