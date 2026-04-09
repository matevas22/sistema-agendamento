# Sistema de Agendamentos de Serviços - NETFLEX

## Descrição

Sistema web desenvolvido em Flask para gerenciamento de agendamentos de serviços de internet da empresa NETFLEX. A aplicação permite o controle de instalações, transferências e outros serviços de fibra óptica, com dashboards específicos para diferentes filiais (Caxias e Vilar).

## Funcionalidades Principais

### 🏠 Dashboards
- **Dashboard Caxias**: Visualização de serviços agendados para a filial de Caxias
- **Dashboard Vilar**: Visualização de serviços agendados para a filial de Vilar
- Indicadores visuais de ocupação diária
- Calendário com indicadores de disponibilidade
- Estatísticas mensais e diárias

### 📝 Gestão de Serviços
- **Adicionar Serviços**: Cadastro de novos agendamentos
- **Visualizar Serviços**: Lista completa de todos os serviços
- **Editar Serviços**: Modificação de datas e observações
- **Excluir Serviços**: Remoção de agendamentos
- Integração com API IXC para consulta de clientes

### 👥 Gestão de Usuários
- Sistema de autenticação com Flask-Login
- Controle de permissões (Admin/Usuário)
- Gerenciamento de usuários (apenas admins)
- Logs de atividades dos usuários
- Recuperação de senha por e-mail

### 📊 Relatórios
- Exportação em CSV, Excel e PDF
- Filtros por data, mês e ano
- Relatórios personalizáveis

### ⚙️ Configurações
- Limites diários por filial e dia da semana
- Gestão de feriados
- Configurações de e-mail

## 🛠️ Tecnologias Utilizadas

### Backend
- **Flask 3.1.1** - Framework web
- **Postgres** - Banco de dados
- **Flask-Login** - Autenticação
- **Flask-WTF** - Formulários e CSRF
- **Flask-Session** - Gerenciamento de sessões
- **Flask-Limiter** - Rate limiting
- **Flask-Mail** - Envio de e-mails

### Frontend
- **HTML5/CSS3** - Estrutura e estilos
- **Tailwind CSS** - Framework CSS
- **JavaScript** - Interatividade
- **Font Awesome** - Ícones
- **Flatpickr** - Seletor de datas
- **SweetAlert2** - Alertas modernos

### Relatórios
- **xlsxwriter** - Geração de Excel
- **FPDF** - Geração de PDF
- **CSV** - Exportação de dados

### Deploy
- **Docker** - Containerização
- **Docker Compose** - Orquestração
- **Gunicorn** - Servidor WSGI
- **Redis** - Cache e sessões

## Instalação

### Pré-requisitos
- Python 3.11+
- Docker e Docker Compose (opcional)

### Instalação Local

1. **Clone o repositório**
```bash
git clone <url-do-repositorio>
cd netflex_app
```

2. **Crie um ambiente virtual**
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows
```

3. **Instale as dependências**
```bash
pip install -r requirements.txt
```

4. **Configure as variáveis de ambiente**
Crie um arquivo `.env` na raiz do projeto:
```env
SECRET_KEY=sua-chave-secreta-aqui
MAIL_SERVER=seu-servidor-smtp
MAIL_PORT=465
MAIL_USE_SSL=True
MAIL_USERNAME=seu-email@exemplo.com
MAIL_PASSWORD=sua-senha-email
IXC_AUTH=seu-token-ixc
```

5. **Inicialize o banco de dados**
```bash
python app.py
# Acesse http://localhost:8001/init_db para inicializar o banco
```

6. **Execute a aplicação**
```bash
python app.py
```

### Instalação com Docker

1. **Clone o repositório**
```bash
git clone <url-do-repositorio>
cd netflex_app
```

2. **Configure as variáveis de ambiente**
Crie um arquivo `.env` com as configurações necessárias.

3. **Execute com Docker Compose**
```bash
docker-compose up -d
```

A aplicação estará disponível em `http://localhost:8001`

## Acesso Inicial

- **URL**: `http://localhost:8001`
- **Login padrão**: `admin`
- **Senha padrão**: `admin123`

⚠️ **Importante**: Altere a senha padrão no primeiro acesso!

## Estrutura do Projeto

```
netflex_app/
├── app.py                 # Aplicação principal Flask
├── config.json           # Configurações do sistema
├── requirements.txt      # Dependências Python
├── Dockerfile           # Configuração Docker
├── docker-compose.yml   # Orquestração Docker
├── gunicorn.conf.py     # Configuração Gunicorn
├── static/              # Arquivos estáticos
│   ├── css/            # Estilos CSS
│   ├── js/             # Scripts JavaScript
│   ├── img/            # Imagens
│   └── fonts/          # Fontes
├── templates/           # Templates HTML
├── instance/           # Banco de dados e logs
└── venv/              # Ambiente virtual
```

## 🔧 Configurações

### Limites Diários
Configure os limites de serviços por dia da semana em cada filial através da interface de configurações (apenas administradores).

### E-mail
Configure as credenciais de e-mail para:
- Recuperação de senha
- Notificações do sistema

### API IXC
Configure o token de autenticação da API IXC para consulta automática de dados dos clientes.

## Funcionalidades por Tipo de Usuário

### Usuário Comum
- Visualizar dashboards
- Adicionar novos serviços
- Visualizar lista de serviços
- Editar serviços existentes
- Gerar relatórios
- Alterar própria senha

### Administrador
- Todas as funcionalidades de usuário comum
- Gerenciar usuários (criar, editar, excluir)
- Visualizar logs de atividades
- Configurar limites diários
- Configurar feriados
- Acessar configurações do sistema

## Deploy em Produção

### Com Docker (Recomendado)

1. **Configure as variáveis de ambiente**
2. **Execute o deploy**
```bash
docker-compose up -d
```

### Deploy Manual

1. **Configure o servidor web** (Nginx/Apache)
2. **Configure o Gunicorn**
3. **Configure SSL/HTTPS**
4. **Configure backup do banco de dados**

## Segurança

- Autenticação obrigatória
- Proteção CSRF
- Rate limiting
- Senhas criptografadas
- Logs de auditoria
- Sessões seguras

## Logs

O sistema mantém logs detalhados de todas as ações dos usuários:
- Login/Logout
- Criação/edição/exclusão de serviços
- Gerenciamento de usuários
- Alterações de configuração

## Solução de Problemas

### Problemas Comuns

1. **Erro de conexão com banco**
   - Verifique se o diretório `instance/` existe
   - Execute `/init_db` para inicializar o banco

2. **Erro de e-mail**
   - Verifique as configurações SMTP no `.env`
   - Teste as credenciais de e-mail

3. **Erro de permissões**
   - Verifique se o usuário tem as permissões necessárias
   - Confirme se está logado como administrador

## Suporte

Para suporte técnico, entre em contato com:
- **Desenvolvedor**: Mateus Vaz
- **E-mail**: suporte.agendamentos@internetflex.com

## Licença

Todos os direitos reservados © Copyright
Desenvolvido por Mateus Vaz

---

**Versão**: 1.0.0  
**Última atualização**: 2024
