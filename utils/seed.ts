import { collection, doc, serverTimestamp, writeBatch, Timestamp } from '@firebase/firestore';
import { db } from '../firebase/config';
import { User, Attribute, RelationshipType, Member, MemberRole, Task, TaskStatus, ProjectMember, UserSummary, TimeLog, Activity, ActivityType, Feature, TaskDependency } from '../types';

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

const getPastDate = (days: number): Timestamp => {
    const date = new Date();
    date.setDate(date.getDate() - days);
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
            acc[member.uid] = {
                uid: member.uid,
                displayName: member.displayName,
                photoURL: member.photoURL,
                email: member.email,
                role: member.role
            };
            return acc;
        }, {} as { [key: string]: ProjectMember }),
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
    
    const userSummary = (member: SeedMember): UserSummary => ({ uid: member.uid, displayName: member.displayName, photoURL: member.photoURL, email: member.email });
    
    // 6. Define Task Categories
    const taskCategoriesData = [
        { id: 'bug_cat', name: 'Bug', color: 'red', icon: 'bug', requiresTesting: true },
        { id: 'feature_cat', name: 'Feature', color: 'blue', icon: 'zap', requiresTesting: true },
        { id: 'chore_cat', name: 'Chore', color: 'gray', icon: 'settings', requiresTesting: false },
    ];
    
    // 7. Define Features
    const featuresData = [
        {
            moduleName: "Gerenciamento de Usuários",
            name: "Registro de Novo Usuário",
            description: "Permite que um novo usuário crie uma conta na plataforma fornecendo nome, e-mail e senha.",
            userFlows: [
                { id: 'uf_reg_1', step: 1, description: "Usuário clica em 'Registrar' na página inicial." },
                { id: 'uf_reg_2', step: 2, description: "Usuário preenche o formulário com nome, e-mail e senha válida." },
                { id: 'uf_reg_3', step: 3, description: "Sistema valida os dados. Se o e-mail não existir, a conta é criada." },
                { id: 'uf_reg_4', step: 4, description: "Usuário é autenticado e redirecionado para o dashboard." },
            ],
            testCases: [
                { id: 'tc_reg_1', description: "Tentar registrar com um e-mail que já existe no sistema.", expectedResult: "O sistema deve exibir uma mensagem de erro informando que o e-mail já está em uso.", status: 'pending' as const },
                { id: 'tc_reg_2', description: "Tentar registrar com uma senha com menos de 6 caracteres.", expectedResult: "O sistema deve exibir uma mensagem de erro sobre a senha ser muito fraca.", status: 'pending' as const },
                { id: 'tc_reg_3', description: "Registro bem-sucedido com dados válidos.", expectedResult: "O usuário deve ser criado, logado e redirecionado para a página principal.", status: 'pending' as const },
            ]
        },
        {
            moduleName: "Gerenciamento de Usuários",
            name: "Login de Usuário com E-mail e Senha",
            description: "Permite que um usuário já registrado acesse sua conta utilizando suas credenciais.",
            userFlows: [
                { id: 'uf_log_1', step: 1, description: "Usuário acessa a página de login." },
                { id: 'uf_log_2', step: 2, description: "Usuário insere seu e-mail e senha corretos." },
                { id: 'uf_log_3', step: 3, description: "Sistema autentica as credenciais." },
                { id: 'uf_log_4', step: 4, description: "Usuário é redirecionado para o dashboard." },
            ],
            testCases: [
                { id: 'tc_log_1', description: "Tentar login com senha incorreta.", expectedResult: "O sistema deve exibir uma mensagem de erro de 'credenciais inválidas'.", status: 'pending' as const },
                { id: 'tc_log_2', description: "Login bem-sucedido.", expectedResult: "O usuário é redirecionado para a página principal.", status: 'pending' as const },
            ]
        },
        {
            moduleName: "Catálogo de Produtos",
            name: "Busca e Filtragem de Produtos",
            description: "Permite que os usuários busquem produtos por texto e apliquem filtros para refinar os resultados.",
            status: 'in_testing' as const,
            userFlows: [
                { id: 'uf_src_1', step: 1, description: "Usuário digita um termo na barra de busca." },
                { id: 'uf_src_2', step: 2, description: "Sistema retorna uma lista de produtos que correspondem ao termo." },
                { id: 'uf_src_3', step: 3, description: "Usuário aplica um filtro (ex: categoria, faixa de preço)." },
                { id: 'uf_src_4', step: 4, description: "A lista de produtos é atualizada para refletir o filtro." },
            ],
            testCases: [
                { id: 'tc_src_1', description: "Buscar por um termo que corresponde a vários produtos.", expectedResult: "A API deve retornar todos os produtos correspondentes com paginação.", status: 'pending' as const },
                { id: 'tc_src_2', description: "Aplicar filtro de preço (ex: $10 - $50).", expectedResult: "A lista de produtos deve ser atualizada para mostrar apenas itens dentro da faixa de preço selecionada.", status: 'pending' as const },
                { id: 'tc_src_3', description: "Buscar por um termo que não corresponde a nenhum produto.", expectedResult: "O sistema deve exibir uma mensagem de 'Nenhum produto encontrado'.", status: 'pending' as const },
            ]
        },
        {
            moduleName: "Catálogo de Produtos",
            name: "Visualização da Página de Detalhes do Produto",
            description: "Como usuário, quero ver informações detalhadas sobre um produto para decidir sobre a compra.",
            userFlows: [
                { id: 'uf_pdp_1', step: 1, description: "Usuário clica em um produto na listagem." },
                { id: 'uf_pdp_2', step: 2, description: "A página de detalhes é carregada, exibindo nome, imagem, descrição, preço e estoque." },
                { id: 'uf_pdp_3', step: 3, description: "Usuário pode ver o botão 'Adicionar ao Carrinho'." },
            ],
            testCases: [
                { id: 'tc_pdp_1', description: "Verificar se todos os campos (nome, imagem, preço) são exibidos corretamente.", expectedResult: "Todas as informações do produto devem estar visíveis e corretas.", status: 'pending' as const },
                { id: 'tc_pdp_2', description: "Acessar a página de um produto sem estoque.", expectedResult: "O botão 'Adicionar ao Carrinho' deve estar desabilitado e uma mensagem 'Fora de estoque' deve ser exibida.", status: 'pending' as const },
            ]
        },
        {
            moduleName: "Carrinho de Compras e Checkout",
            name: "Finalização de Compra com Stripe",
            description: "Como usuário, quero finalizar minha compra de forma segura utilizando um cartão de crédito.",
            userFlows: [
                 { id: 'uf_chk_1', step: 1, description: "Usuário clica em 'Finalizar Compra' no carrinho." },
                 { id: 'uf_chk_2', step: 2, description: "Usuário preenche os dados de pagamento no formulário do Stripe." },
                 { id: 'uf_chk_3', step: 3, description: "O pagamento é processado com sucesso." },
                 { id: 'uf_chk_4', step: 4, description: "O pedido é criado no sistema com status 'pago' e o usuário vê uma página de confirmação." },
            ],
            testCases: [
                { id: 'tc_chk_1', description: "Testar finalização com um cartão de crédito de teste válido.", expectedResult: "O pagamento deve ser aprovado e o pedido criado.", status: 'passed' as const },
                { id: 'tc_chk_2', description: "Testar finalização com um cartão de crédito de teste inválido.", expectedResult: "O pagamento deve ser recusado e uma mensagem de erro exibida.", status: 'pending' as const },
            ]
        },
        {
            moduleName: "Carrinho de Compras e Checkout",
            name: "Adicionar Produto ao Carrinho",
            description: "Como usuário, quero adicionar um produto ao meu carrinho de compras para poder comprá-lo mais tarde.",
            status: 'in_testing' as const,
            userFlows: [
                { id: 'uf_cart_1', step: 1, description: "Usuário está na página de detalhes de um produto com estoque." },
                { id: 'uf_cart_2', step: 2, description: "Usuário clica no botão 'Adicionar ao Carrinho'." },
                { id: 'uf_cart_3', step: 3, description: "O produto é adicionado ao carrinho e o usuário vê uma confirmação." },
                { id: 'uf_cart_4', step: 4, description: "O ícone do carrinho no cabeçalho é atualizado com a quantidade de itens." },
            ],
            testCases: [
                { id: 'tc_cart_1', description: "Adicionar um produto ao carrinho com sucesso.", expectedResult: "O produto deve aparecer no carrinho com a quantidade correta.", status: 'pending' as const },
                { id: 'tc_cart_2', description: "Tentar adicionar um produto sem estoque.", expectedResult: "O botão 'Adicionar ao Carrinho' deve estar desabilitado.", status: 'pending' as const },
                { id: 'tc_cart_3', description: "Aumentar a quantidade de um item já existente no carrinho.", expectedResult: "A quantidade do item no carrinho deve ser atualizada, não adicionada como um novo item.", status: 'pending' as const },
            ]
        },
    ];

    // 8. Define Tasks, linked to modules and features by name
    const tasksData: (Pick<Task, 'title' | 'description' | 'status' | 'assignee' | 'commentsCount'> & { moduleName: string; categoryName: string, featureName?: string, dueDate?: Timestamp, timeLogs?: TimeLog[], dependencies?: { type: 'blocking' | 'blocked_by', taskIndex: number }[] })[] = [
        {
            moduleName: "Gerenciamento de Usuários",
            featureName: "Registro de Novo Usuário",
            title: "Implementar endpoint de registro com hash de senha",
            description: "Criar a rota POST /api/auth/register que valida os dados do usuário, hasheia a senha com bcrypt e salva no banco de dados.",
            status: 'done',
            assignee: userSummary(aliceMember),
            commentsCount: 1,
            timeLogs: [
                { userId: aliceMember.uid, durationInSeconds: 7200, loggedAt: getPastDate(4) },
                { userId: aliceMember.uid, durationInSeconds: 3600, loggedAt: getPastDate(3) },
            ],
            categoryName: 'Feature',
            dueDate: getFutureDate(-5),
            dependencies: [
                { type: 'blocking', taskIndex: 1 },
                { type: 'blocking', taskIndex: 7 },
            ],
        },
        {
            moduleName: "Gerenciamento de Usuários",
            featureName: "Login de Usuário com E-mail e Senha",
            title: "Desenvolver fluxo de login com JWT",
            description: "Criar a rota POST /api/auth/login que verifica as credenciais e retorna um JSON Web Token (JWT) em caso de sucesso.",
            status: 'inprogress',
            assignee: userSummary(aliceMember),
            commentsCount: 0,
            timeLogs: [
                { userId: aliceMember.uid, durationInSeconds: 5400, loggedAt: getPastDate(2) },
            ],
            categoryName: 'Feature',
            dueDate: getFutureDate(3),
            dependencies: [
                { type: 'blocked_by', taskIndex: 0 },
                { type: 'blocking', taskIndex: 7 },
            ],
        },
        {
            moduleName: "Catálogo de Produtos",
            featureName: "Busca e Filtragem de Produtos",
            title: "Desenvolver API de busca de produtos (com paginação)",
            description: "Criar a rota GET /api/products que permite buscar produtos com filtros e paginação.",
            status: 'in_testing',
            assignee: userSummary(bobMember),
            commentsCount: 1,
            timeLogs: [
                { userId: bobMember.uid, durationInSeconds: 10800, loggedAt: getPastDate(2) },
                { userId: bobMember.uid, durationInSeconds: 1800, loggedAt: getPastDate(1) },
            ],
            categoryName: 'Feature',
            dueDate: getFutureDate(-1),
            dependencies: [
                { type: 'blocking', taskIndex: 3 },
            ],
        },
        {
            moduleName: "Catálogo de Produtos",
            featureName: "Visualização da Página de Detalhes do Produto",
            title: "Criar UI para a página de detalhes do produto",
            description: "Desenvolver a interface do usuário para a página de detalhes, mostrando imagem, preço, descrição e botão de adicionar ao carrinho.",
            status: 'todo',
            assignee: userSummary(bobMember),
            commentsCount: 0,
            timeLogs: [
                { userId: bobMember.uid, durationInSeconds: 9000, loggedAt: getPastDate(1) },
            ],
            categoryName: 'Feature',
            dueDate: getFutureDate(5),
            dependencies: [
                { type: 'blocked_by', taskIndex: 2 },
            ],
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
            featureName: "Finalização de Compra com Stripe",
            title: "Integrar API do Stripe para pagamentos",
            description: "Implementar o fluxo de checkout usando a API Payment Intents do Stripe para processar pagamentos de forma segura.",
            status: 'done',
            assignee: userSummary(ownerMember),
            commentsCount: 0,
            timeLogs: [
                 { userId: ownerMember.uid, durationInSeconds: 14400, loggedAt: getPastDate(6) },
            ],
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
            dependencies: [
                { type: 'blocked_by', taskIndex: 0 },
                { type: 'blocked_by', taskIndex: 1 },
            ],
        },
        {
            moduleName: "Carrinho de Compras e Checkout",
            featureName: "Adicionar Produto ao Carrinho",
            title: "Implementar lógica para adicionar item ao carrinho",
            description: "Desenvolver a funcionalidade no frontend e backend para adicionar um produto ao carrinho de compras do usuário. Validar o estoque antes de adicionar.",
            status: 'in_testing',
            assignee: userSummary(carolMember),
            commentsCount: 0,
            timeLogs: [
                { userId: carolMember.uid, durationInSeconds: 6300, loggedAt: getPastDate(1) }
            ],
            categoryName: 'Feature',
            dueDate: getFutureDate(2),
        }
    ];

    // 9. Define Comments, linked by array index to tasksData
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

    // 10. Define Activities
    const activitiesData = [
        {
            taskIndex: 0, // Implementar endpoint de registro
            user: userSummary(aliceMember),
            type: 'task_created' as const,
            message: `${aliceMember.displayName} criou a tarefa "Implementar endpoint de registro com hash de senha".`,
            createdAt: getPastDate(5)
        },
        {
            taskIndex: 2, // Desenvolver API de busca
            user: userSummary(bobMember),
            type: 'task_created' as const,
            message: `${bobMember.displayName} criou a tarefa "Desenvolver API de busca de produtos (com paginação)".`,
            createdAt: getPastDate(4)
        },
        {
            taskIndex: 0, // Implementar endpoint de registro
            user: userSummary(aliceMember),
            type: 'task_status_changed' as const,
            message: `${aliceMember.displayName} moveu a tarefa "Implementar endpoint de registro com hash de senha" para Concluído.`,
            createdAt: getPastDate(3)
        },
        {
            taskIndex: 2, // Desenvolver API de busca
            user: userSummary(bobMember),
            type: 'task_status_changed' as const,
            message: `${bobMember.displayName} moveu a tarefa "Desenvolver API de busca de produtos (com paginação)" para Em Teste.`,
            createdAt: getPastDate(1)
        },
        {
            user: userSummary(ownerMember),
            type: 'member_added' as const,
            message: `${ownerMember.displayName} adicionou ${aliceMember.displayName} ao projeto.`,
            createdAt: getPastDate(7)
        }
    ];

    return {
        projectData,
        modulesData,
        entitiesData,
        relationshipsData,
        featuresData,
        tasksData,
        mockUsers,
        commentsData,
        taskCategoriesData,
        activitiesData,
    };
};

export const seedDatabase = async (currentUser: User) => {
    if (!currentUser.email) throw new Error("Current user has no email for seeding.");

    const { 
        projectData, 
        modulesData, 
        entitiesData, 
        relationshipsData,
        featuresData,
        tasksData, 
        mockUsers,
        commentsData,
        taskCategoriesData,
        activitiesData,
    } = getSeedData(currentUser);
    
    const batch = writeBatch(db);

    // 1. Create Project
    const projectRef = doc(collection(db, 'projects'));
    batch.set(projectRef, { ...projectData, createdAt: serverTimestamp() });
    const projectId = projectRef.id;

    // 2. Add mock users (if they don't exist)
    for (const user of mockUsers) {
        const userRef = doc(db, 'users', user.uid);
        batch.set(userRef, { ...user, createdAt: serverTimestamp(), activeTimer: null }, { merge: true });
    }

    // 2a. Create Task Categories
    const categoryNameToIdMap = new Map<string, string>();
    for (const category of taskCategoriesData) {
        const categoryRef = doc(db, 'projects', projectId, 'taskCategories', category.id);
        batch.set(categoryRef, {
            projectId,
            name: category.name,
            color: category.color,
            icon: category.icon,
            requiresTesting: category.requiresTesting
        });
        categoryNameToIdMap.set(category.name, category.id);
    }

    // 3. Create Modules & Docs, storing their IDs
    const moduleNameToIdMap = new Map<string, string>();
    for (const module of modulesData) {
        const moduleRef = doc(collection(db, 'projects', projectId, 'modules'));
        batch.set(moduleRef, {
            projectId,
            name: module.name,
            description: module.description,
            icon: module.icon,
            color: module.color,
            createdAt: serverTimestamp(),
        });
        moduleNameToIdMap.set(module.name, moduleRef.id);
        
        const docRef = doc(collection(db, 'projects', projectId, 'modules', moduleRef.id, 'documentation'));
        batch.set(docRef, { content: module.documentation, updatedAt: serverTimestamp() });
    }

    // 4. Create Features, storing their IDs
    const featureNameToIdMap = new Map<string, string>();
    for (const feature of featuresData) {
        const featureRef = doc(collection(db, 'projects', projectId, 'features'));
        const moduleId = moduleNameToIdMap.get(feature.moduleName);
        if (moduleId) {
            batch.set(featureRef, {
                projectId,
                name: feature.name,
                description: feature.description,
                moduleId: moduleId,
                userFlows: feature.userFlows,
                testCases: feature.testCases,
                status: (feature as any).status || 'backlog',
                createdAt: serverTimestamp(),
            });
            featureNameToIdMap.set(feature.name, featureRef.id);
        }
    }

    // 5. Create Entities, storing their IDs
    const entityNameToIdMap = new Map<string, string>();
    for (const entity of entitiesData) {
        const entityRef = doc(collection(db, 'projects', projectId, 'entities'));
        batch.set(entityRef, {
            ...entity,
            projectId,
            createdAt: serverTimestamp(),
            relatedModuleIds: [],
            relatedTaskIds: [],
        });
        entityNameToIdMap.set(entity.name, entityRef.id);
    }
    
    // 6. Create Relationships using stored IDs
    for (const rel of relationshipsData) {
        const sourceEntityId = entityNameToIdMap.get(rel.sourceEntityName);
        const targetEntityId = entityNameToIdMap.get(rel.targetEntityName);
        if (sourceEntityId && targetEntityId) {
            const relRef = doc(collection(db, 'projects', projectId, 'relationships'));
            batch.set(relRef, {
                projectId,
                sourceEntityId,
                targetEntityId,
                type: rel.type,
                description: rel.description,
                createdAt: serverTimestamp(),
            });
        }
    }
    
    // 7. Create Tasks, resolving dependencies
    const taskRefsWithIds = tasksData.map((_, i) => {
        const ref = doc(collection(db, 'projects', projectId, 'tasks'));
        return { ref, id: ref.id, index: i };
    });
    const taskIndexToIdMap = new Map<number, string>(taskRefsWithIds.map(d => [d.index, d.id]));
    
    for (const { ref, index } of taskRefsWithIds) {
        const task = tasksData[index];
        const moduleId = moduleNameToIdMap.get(task.moduleName);
        const featureId = task.featureName ? featureNameToIdMap.get(task.featureName) : undefined;
    
        const resolvedDependencies = (task.dependencies || []).map(dep => {
            const taskId = taskIndexToIdMap.get(dep.taskIndex);
            if (!taskId) return null;
            return { type: dep.type, taskId: taskId };
        }).filter(Boolean) as TaskDependency[];
    
        const taskPayload: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>> = {
            projectId,
            title: task.title,
            description: task.description,
            status: task.status,
            assignee: task.assignee,
            commentsCount: task.commentsCount,
            dueDate: task.dueDate || null,
            dependencies: resolvedDependencies,
            links: [],
            timeLogs: task.timeLogs || [],
            moduleId: moduleId,
        };

        if (featureId) {
            taskPayload.featureId = featureId;
        }

        if (task.categoryName) {
            const categoryId = categoryNameToIdMap.get(task.categoryName);
            if (categoryId) {
                taskPayload.categoryId = categoryId;
            }
        }
        
        batch.set(ref, {
            ...taskPayload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    }

    // 8. Create Comments, linking to tasks using stored IDs
    for (const commentGroup of commentsData) {
        const taskId = taskIndexToIdMap.get(commentGroup.taskId);
        if (taskId) {
            for (const comment of commentGroup.comments) {
                const commentRef = doc(collection(db, 'projects', projectId, 'tasks', taskId, 'comments'));
                batch.set(commentRef, {
                    ...comment,
                    createdAt: serverTimestamp(),
                });
            }
        }
    }

    // 9. Create Activities, linking to tasks using stored IDs
    for (const activity of activitiesData) {
        const taskId = activity.taskIndex !== undefined ? taskIndexToIdMap.get(activity.taskIndex) : undefined;
        const activityRef = doc(collection(db, 'projects', projectId, 'activity'));
        
        const activityPayload: Omit<Activity, 'id'> = {
            projectId,
            type: activity.type,
            message: activity.message,
            user: activity.user,
            createdAt: activity.createdAt,
            ...(taskId && { taskId })
        };
        
        batch.set(activityRef, activityPayload);
    }

    await batch.commit();
};
