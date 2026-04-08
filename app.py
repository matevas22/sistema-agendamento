import locale
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, send_file
import http.client
import json
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_wtf.csrf import CSRFProtect
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from flask_wtf import FlaskForm
from wtforms import StringField, SelectField, PasswordField  
from wtforms.validators import DataRequired, Length, EqualTo  
import sqlite3
import psycopg2
from psycopg2.extras import DictCursor
from wtforms import TextAreaField
import logging
from flask_session import Session
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import time
import io
import csv
import xlsxwriter
from fpdf import FPDF
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer, SignatureExpired
import os
from dotenv import load_dotenv
load_dotenv()


app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'default-secret-key')

app.config['TEMPLATES_AUTO_RELOAD'] = False
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 31536000  # 1 ano
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)  

app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'mail.internetflex.com')
app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 465))
app.config['MAIL_USE_SSL'] = os.environ.get('MAIL_USE_SSL', 'True') == 'True'
app.config['MAIL_USE_TLS'] = os.environ.get('MAIL_USE_TLS', 'False') == 'True'
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME', 'suporte.agendamentos@internetflex.com')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD', '')
app.config['SESSION_TYPE'] = 'filesystem'  

IXC_AUTH = os.environ.get('IXC_AUTH')

mail = Mail(app)
s = URLSafeTimedSerializer(app.secret_key)

csrf = CSRFProtect(app)  
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
Session(app)  


logging.basicConfig(filename='instance/user_logs.log', level=logging.INFO, 
                    format='%(asctime)s - %(levelname)s - %(message)s')


class DBConnectionWrapper:
    def __init__(self, conn):
        self._conn = conn
        self.row_factory = None

    def cursor(self):
        return DBCursorWrapper(self._conn.cursor(cursor_factory=DictCursor))

    def commit(self):
        return self._conn.commit()

    def rollback(self):
        return self._conn.rollback()

    def close(self):
        return self._conn.close()


class DBCursorWrapper:
    def __init__(self, cursor):
        self._cursor = cursor
        self.lastrowid = None

    def execute(self, query, params=None):
        pg_query = query.replace('?', '%s')
        self._cursor.execute(pg_query, params or ())

        normalized = query.strip().upper()
        if normalized.startswith('INSERT') and 'RETURNING' not in normalized:
            try:
                self._cursor.execute('SELECT LASTVAL()')
                last = self._cursor.fetchone()
                self.lastrowid = last[0] if last else None
            except Exception:
                self.lastrowid = None
        return self

    def fetchone(self):
        return self._cursor.fetchone()

    def fetchall(self):
        return self._cursor.fetchall()

    def __getattr__(self, name):
        return getattr(self._cursor, name)


def get_db_connection():
    retries = int(os.environ.get('DB_CONNECT_RETRIES', 20))
    retry_delay = float(os.environ.get('DB_CONNECT_RETRY_DELAY', 1.5))
    last_error = None

    for attempt in range(1, retries + 1):
        try:
            conn = psycopg2.connect(
                host=os.environ.get('DB_HOST', 'postgres-nova'),
                port=int(os.environ.get('DB_PORT', 5432)),
                dbname=os.environ.get('DB_NAME', 'agendamentos'),
                user=os.environ.get('DB_USER', 'mateus'),
                password=os.environ.get('DB_PASSWORD', 'Vazdevflex@390')
            )
            return DBConnectionWrapper(conn)
        except psycopg2.OperationalError as exc:
            last_error = exc
            if attempt < retries:
                time.sleep(retry_delay)

    raise last_error

class AddUserForm(FlaskForm):
    name = StringField('Nome', validators=[DataRequired(message="O nome é obrigatório."), Length(max=100)])
    login = StringField('Login', validators=[DataRequired(message="O login é obrigatório."), Length(max=50)])
    type = SelectField('Tipo', choices=[('admin', 'Admin'), ('user', 'User')], validators=[DataRequired(message="O tipo é obrigatório.")])
    password = PasswordField('Senha', validators=[DataRequired(message="A senha é obrigatória."), Length(min=6, max=100)])
    confirm_password = PasswordField('Confirmar Senha', validators=[DataRequired(), EqualTo('password', message="As senhas devem coincidir.")])

class AddInstallationForm(FlaskForm):
    client_id = StringField('ID do Cliente', validators=[DataRequired(message="O ID do cliente é obrigatório.")])
    client_name = StringField('Nome do Cliente', validators=[DataRequired(message="O nome do cliente é obrigatório.")])
    installation_type = SelectField(
        'Tipo de Instalação',
        choices=[
            ('Instalação Fibra', 'Instalação Fibra'),
            ('Transferência Fibra', 'Transferência Fibra')
        ],
        validators=[DataRequired(message="O tipo de instalação é obrigatório.")]
    )
    plan = StringField('Plano', validators=[DataRequired(message="O plano é obrigatório.")])
    request_date = StringField('Vencimento', validators=[DataRequired(message="Vencimento é obrigatória.")])
    due_date = StringField('Data de Instalação', validators=[DataRequired(message="Data de Instalação é obrigatória.")])
    attendant = StringField('Atendente', validators=[DataRequired(message="O atendente é obrigatório.")])
    observation = TextAreaField('Observação')


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            login TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            type TEXT NOT NULL,
            must_change_password INTEGER DEFAULT 1,
            created_by INTEGER,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS installations (
            id SERIAL PRIMARY KEY,
            client_id TEXT NOT NULL,
            client_name TEXT NOT NULL,
            installation_type TEXT NOT NULL,
            plan TEXT NOT NULL,
            request_date TEXT,
            due_date TEXT NOT NULL,
            attendant TEXT NOT NULL,
            observation TEXT,
            created_by INTEGER NOT NULL,
            turno_preferencial TEXT,
            filial TEXT,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            action TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    cursor.execute('ALTER TABLE user_logs ADD COLUMN IF NOT EXISTS ip_address TEXT')
    cursor.execute('ALTER TABLE user_logs ADD COLUMN IF NOT EXISTS user_agent TEXT')
    cursor.execute('ALTER TABLE installations ADD COLUMN IF NOT EXISTS filial TEXT')
    cursor.execute('ALTER TABLE installations ADD COLUMN IF NOT EXISTS turno_preferencial TEXT')

    cursor.execute('SELECT * FROM users WHERE login = ?', ('admin',))
    if not cursor.fetchone():
        cursor.execute('''
            INSERT INTO users (name, login, password, type, must_change_password, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
            RETURNING id
        ''', ('Admin NETFLEX', 'admin', generate_password_hash('admin123'), 'admin', 1, None))
        admin_id = cursor.fetchone()[0]
        cursor.execute('UPDATE users SET created_by = ? WHERE id = ?', (admin_id, admin_id))
    conn.commit()
    conn.close()


class User(UserMixin):
    def __init__(self, id, name, login, type):
        self.id = id
        self.name = name
        self.login = login
        self.type = type

    def get_id(self):
        return str(self.id)

@app.route('/init_db')
def initialize_db():
    init_db()
    return "Banco de dados inicializado!"

@login_manager.user_loader
def load_user(user_id):
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return None
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    conn.close()
    if user:
        return User(user['id'], user['name'], user['login'], user['type'])
    return None

def log_action(user_id, action, details=None):
    from flask import request
    conn = get_db_connection()
    cursor = conn.cursor()
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    if details:
        action = f"{action} | {details}"
    
    ip_address = request.remote_addr if request else None
    user_agent = request.headers.get('User-Agent', '') if request else ''
    
    cursor.execute('INSERT INTO user_logs (user_id, action, timestamp, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
                   (user_id, action, timestamp, ip_address, user_agent))
    conn.commit()
    conn.close()
    logging.info(f'User {user_id}: {action}')

@app.route('/')
@login_required
def index():
    return redirect(url_for('dashboard'))

limiter = Limiter(get_remote_address, app=app, default_limits=["200 per day", "50 per hour"])
@app.route('/login', methods=['GET', 'POST'])
@limiter.limit("5 per minute")
@csrf.exempt
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    if request.method == 'POST':
        login_input = request.form['login']
        password = request.form['password']
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE login = ?', (login_input,))
        user = cursor.fetchone()
        conn.close()
        if user and check_password_hash(user['password'], password):
            user_obj = User(user['id'], user['name'], user['login'], user['type'])
            login_user(user_obj)
            log_action(user['id'], 'Login')
            if user['must_change_password'] == 1:
                return redirect(url_for('trocar_senha_primeiro'))
            next_page = request.args.get('next')

            if next_page and next_page.startswith('/'):
                return redirect(next_page)
            return redirect(url_for('dashboard'))
        flash('Credenciais inválidas', 'error')
    return render_template('login.html')

def limit_login_attempts(e):
    retry_after = int(e.reset_at - time.time())
    response = jsonify(sucess=False, message='Muitas tentativas de login. Tente novamente mais tarde.')
    response.status_code = 429
    response.headers['Retry-After'] = str(retry_after)
    return response

@login_manager.unauthorized_handler
def unauthorized_callback():
    return redirect(url_for('login', next=request.path))

@app.route('/logout')
@login_required
@csrf.exempt
def logout():
    log_action(current_user.id, 'Logout')
    logout_user()
    return redirect(url_for('login'))

locale.setlocale(locale.LC_TIME, 'pt_BR.UTF-8')


@app.route('/dashboard')
@login_required
def dashboard():
    try:
        locale.setlocale(locale.LC_TIME, 'pt_BR.UTF-8')
    except locale.Error:
        locale.setlocale(locale.LC_TIME, '')

    date_str = request.args.get('data')
    if date_str:
        try:
            now = datetime.strptime(date_str, '%Y-%m-%d')
        except Exception:
            now = datetime.now()
    else:
        now = datetime.now()
    today_str = now.strftime('%Y-%m-%d')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM installations WHERE due_date = ? AND filial = ?', (today_str, 'Caxias'))
    installations = cursor.fetchall()
    installations_list = []
    for inst in installations:
        inst_dict = dict(inst)
        if inst_dict.get('request_date') is not None:
            try:
                inst_dict['request_date'] = int(inst_dict['request_date'])
            except Exception:
                inst_dict['request_date'] = inst_dict['request_date']
        if inst_dict.get('due_date'):
            try:
                inst_dict['due_date'] = datetime.strptime(inst_dict['due_date'], '%Y-%m-%d').strftime('%d/%m/%Y')
            except Exception:
                pass
        inst_dict['filial'] = inst_dict.get('filial', '')
        installations_list.append(inst_dict)

    first_day_month = now.replace(day=1).strftime('%Y-%m-%d')
    last_day_month = (now.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    last_day_month_str = last_day_month.strftime('%Y-%m-%d')
    cursor.execute('SELECT COUNT(*) as total FROM installations WHERE filial = ? AND due_date BETWEEN ? AND ?', ('Caxias', first_day_month, last_day_month_str))
    total_installations = cursor.fetchone()['total']
    cursor.execute('SELECT COUNT(*) as fiber FROM installations WHERE installation_type = ? AND filial = ? AND due_date = ?', ('Instalação Fibra', 'Caxias', today_str))
    fiber_installations = cursor.fetchone()['fiber']
    cursor.execute('SELECT COUNT(*) as radio FROM installations WHERE installation_type = ? AND filial = ? AND due_date = ?', ('Transferência Fibra', 'Caxias', today_str))
    trans_fibra = cursor.fetchone()['radio']
    cursor.execute('SELECT COUNT(*) as today_installations FROM installations WHERE due_date = ? AND filial = ?', (today_str, 'Caxias'))
    today_installations = cursor.fetchone()['today_installations']
    
    config = get_config()
    today_str = now.strftime('%Y-%m-%d')
    limite_diario = get_limit_for_date('Caxias', today_str)
    
    vagas_disponiveis = max(0, limite_diario - today_installations)
    
    cursor.execute('''
        SELECT due_date, COUNT(*) as count 
        FROM installations 
        WHERE filial = ? AND due_date BETWEEN ? AND ? 
        GROUP BY due_date
    ''', ('Caxias', first_day_month, last_day_month_str))
    
    daily_counts = {}
    for row in cursor.fetchall():
        daily_counts[row['due_date']] = row['count']
    
    calendar_indicators = {}
    limites_personalizados = config.get('limites_personalizados', {})
    current_date = now.replace(day=1)
    while current_date.month == now.month:
        date_str = current_date.strftime('%Y-%m-%d')
        day_limit = get_limit_for_date('Caxias', date_str)
        day_count = daily_counts.get(date_str, 0)
        
        is_personalizado = 'Caxias' in limites_personalizados and date_str in limites_personalizados['Caxias']
        
        if day_count > 0:
            if day_count >= day_limit:
                calendar_indicators[date_str] = {'status': 'red', 'limit': day_limit, 'count': day_count, 'personalizado': is_personalizado}  # Dia lotado
            else:
                calendar_indicators[date_str] = {'status': 'blue', 'limit': day_limit, 'count': day_count, 'personalizado': is_personalizado}  # Dia com serviços
        else:
            calendar_indicators[date_str] = {'status': None, 'limit': day_limit, 'count': 0, 'personalizado': is_personalizado}  # Dia sem serviços
        
        current_date += timedelta(days=1)
    
    conn.close()
    dias_semana_pt = [
        "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira",
        "Sexta-feira", "Sábado", "Domingo"
    ]
    return render_template(
        'dashboard.html',
        installations=installations_list,
        total_installations=total_installations,
        fiber_installations=fiber_installations,
        trans_fibra=trans_fibra,
        total_users=today_installations,
        vagas_disponiveis=vagas_disponiveis,
        limite_diario=limite_diario,
        now=now,
        timedelta=timedelta,
        dias_semana_pt=dias_semana_pt,
        calendar_indicators=calendar_indicators
    )

@app.route('/dashboard_vilar')
@login_required
def dashboard_vilar():
    try:
        locale.setlocale(locale.LC_TIME, 'pt_BR.UTF-8')
    except locale.Error:
        locale.setlocale(locale.LC_TIME, '')
    date_str = request.args.get('data')
    if date_str:
        try:
            now = datetime.strptime(date_str, '%Y-%m-%d')
        except Exception:
            now = datetime.now()
    else:
        now = datetime.now()
    today_str = now.strftime('%Y-%m-%d')
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM installations WHERE due_date = ? AND filial = ?', (today_str, 'Vilar'))
    installations = cursor.fetchall()
    installations_list = []
    for inst in installations:
        inst_dict = dict(inst)
        if inst_dict.get('request_date') is not None:
            try:
                inst_dict['request_date'] = int(inst_dict['request_date'])
            except Exception:
                inst_dict['request_date'] = inst_dict['request_date']
        if inst_dict.get('due_date'):
            try:
                inst_dict['due_date'] = datetime.strptime(inst_dict['due_date'], '%Y-%m-%d').strftime('%d/%m/%Y')
            except Exception:
                pass
        inst_dict['filial'] = inst_dict.get('filial', '')
        installations_list.append(inst_dict)
    first_day_month = now.replace(day=1).strftime('%Y-%m-%d')
    last_day_month = (now.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    last_day_month_str = last_day_month.strftime('%Y-%m-%d')
    cursor.execute('SELECT COUNT(*) as total FROM installations WHERE filial = ? AND due_date BETWEEN ? AND ?', ('Vilar', first_day_month, last_day_month_str))
    total_installations = cursor.fetchone()['total']
    cursor.execute('SELECT COUNT(*) as fiber FROM installations WHERE installation_type = ? AND filial = ? AND due_date = ?', ('Instalação Fibra', 'Vilar', today_str))
    fiber_installations = cursor.fetchone()['fiber']
    cursor.execute('SELECT COUNT(*) as radio FROM installations WHERE installation_type = ? AND filial = ? AND due_date = ?', ('Transferência Fibra', 'Vilar', today_str))
    trans_fibra = cursor.fetchone()['radio']
    cursor.execute('SELECT COUNT(*) as today_installations FROM installations WHERE due_date = ? AND filial = ?', (today_str, 'Vilar'))
    today_installations = cursor.fetchone()['today_installations']
    
    config = get_config()
    today_str = now.strftime('%Y-%m-%d')
    limite_diario = get_limit_for_date('Vilar', today_str)
    
    vagas_disponiveis = max(0, limite_diario - today_installations)
    
    cursor.execute('''
        SELECT due_date, COUNT(*) as count 
        FROM installations 
        WHERE filial = ? AND due_date BETWEEN ? AND ? 
        GROUP BY due_date
    ''', ('Vilar', first_day_month, last_day_month_str))
    
    daily_counts = {}
    for row in cursor.fetchall():
        daily_counts[row['due_date']] = row['count']
    
    calendar_indicators = {}
    limites_personalizados = config.get('limites_personalizados', {})
    current_date = now.replace(day=1)
    while current_date.month == now.month:
        date_str = current_date.strftime('%Y-%m-%d')
        day_limit = get_limit_for_date('Vilar', date_str)
        day_count = daily_counts.get(date_str, 0)
        

        is_personalizado = 'Vilar' in limites_personalizados and date_str in limites_personalizados['Vilar']
        
        if day_count > 0:
            if day_count >= day_limit:
                calendar_indicators[date_str] = {'status': 'red', 'limit': day_limit, 'count': day_count, 'personalizado': is_personalizado}  
            else:
                calendar_indicators[date_str] = {'status': 'blue', 'limit': day_limit, 'count': day_count, 'personalizado': is_personalizado}  
        else:
            calendar_indicators[date_str] = {'status': None, 'limit': day_limit, 'count': 0, 'personalizado': is_personalizado}  
        
        current_date += timedelta(days=1)
    
    conn.close()
    dias_semana_pt = [
        "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira",
        "Sexta-feira", "Sábado", "Domingo"
    ]
    return render_template(
        'dashboard_vilar.html',
        installations=installations_list,
        total_installations=total_installations,
        fiber_installations=fiber_installations,
        trans_fibra=trans_fibra,
        total_users=today_installations,
        vagas_disponiveis=vagas_disponiveis,
        limite_diario=limite_diario,
        now=now,
        timedelta=timedelta,
        dias_semana_pt=dias_semana_pt,
        calendar_indicators=calendar_indicators
    )

@app.route('/add_installation', methods=['GET', 'POST'])
@login_required
def add_installation():
    config = get_config()
    limites = config.get('limite_diario', {
        'Caxias': {'seg': 20, 'ter': 20, 'qua': 20, 'qui': 20, 'sex': 20, 'sab': 5, 'dom': 5},
        'Vilar': {'seg': 20, 'ter': 20, 'qua': 20, 'qui': 20, 'sex': 20, 'sab': 5, 'dom': 5},
    })
    if request.method == 'POST':
        print("Form data:", dict(request.form))  
        try:
            observation = request.form.get('observation', '')
            filial = request.form.get('filial', '')
            if not filial:
                return jsonify({'success': False, 'message': 'O campo Filial é obrigatório.'})
            client_id = request.form['clientId']
            client_name = request.form['clientName']
            installation_type = request.form['installationType']
            
            transfer_services = [
                'Pedido de Transferência',
                'Transferência',
                'Transferência de Comodo',
                'Transferência Fibra',
                'Transferência Utp',
                'Transferência + troc. titularidade',
                'Troca de cômodo',
                'Extenção de Fibra',
                'Migração',
                'Outra instalação fibra',
                'Outra instalação Utp'
            ]
            
            if installation_type not in transfer_services:
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute('SELECT id FROM installations WHERE client_id = ? OR client_name = ?', (client_id, client_name))
                duplicado = cursor.fetchone()
                if duplicado:
                    conn.close()
                    return jsonify({'success': False, 'message': 'Já existe uma instalação com este ID Cliente ou Nome Cliente.'})
                conn.close()
            plan = request.form['plan']
            installation_type = request.form['installationType']
            
            services_without_due_date = [
                'Troca de cômodo',
                'Extenção de Fibra',
                'Transferência + troc. titularidade',
                'Transferência Fibra',
                'Transferência de Comodo',
                'Transferência',
                'Pedido de Transferência',
                'Migração'
            ]
            
            installation_types_without_due_date_for_prepaid = [
                'Instalação Fibra',
                'Instalação Utp',
                'Outra instalação fibra',
                'Outra instalação Utp'
            ]
            
            is_installation_with_prepaid_plan = installation_type in installation_types_without_due_date_for_prepaid and plan == '600MB PRÉ-PAGO'
            
            needs_due_date = plan != '600MB PRÉ-PAGO' and installation_type not in services_without_due_date and not is_installation_with_prepaid_plan
            
            if needs_due_date:
                try:
                    request_day = int(request.form['requestDate'])
                except (ValueError, TypeError):
                    return jsonify({'success': False, 'message': 'O campo requestDate deve ser um número (dia do mês).'})
                if not (1 <= request_day <= 31):
                    return jsonify({'success': False, 'message': 'Dia de solicitação inválido. Use um valor entre 1 e 31.'})
                request_date = request_day
            else:
                request_date = None
            due_date = datetime.strptime(request.form['dueDate'], '%Y-%m-%d')

            due_date_str = due_date.strftime('%Y-%m-%d')
            max_por_dia = get_limit_for_date(filial, due_date_str)
            
            max_por_dia = int(max_por_dia) if max_por_dia is not None else 20
            
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                'SELECT COUNT(*) FROM installations WHERE filial = ? AND due_date = ?',
                (filial, due_date_str)
            )
            count = cursor.fetchone()[0]
            
            if max_por_dia == 0:
                conn.close()
                return jsonify({'success': False, 'message': f'Não é possível agendar instalações para {filial} no dia {due_date.strftime("%d/%m/%Y")}. O limite está configurado como 0.'})
            
            if count >= max_por_dia:
                conn.close()
                return jsonify({'success': False, 'message': f'Limite de {max_por_dia} instalações para {filial} no dia {due_date.strftime("%d/%m/%Y")} atingido. Já existem {count} agendamentos.'})

            installation = {
                'client_id': request.form['clientId'],
                'client_name': request.form['clientName'],
                'installation_type': request.form['installationType'],
                'plan': request.form['plan'],
                'request_date': request_date, 
                'due_date': due_date,
                'attendant': request.form['attendant'],
                'turno_preferencial': request.form.get('turno_preferencial', ''),
                'observation': observation,
                'filial': filial,
                'created_by': current_user.id
            }
            print("Installation data to save:", installation)  # Debug
        except KeyError as e:
            print("Erro KeyError:", e)  # Debug
            return jsonify({'success': False, 'message': f'Campo obrigatório ausente: {e.args[0]}'})
        except ValueError as e:
            print("Erro ValueError:", e)  # Debug
            return jsonify({'success': False, 'message': 'Formato de data inválido ou dia inválido.'})

        try:
            cursor.execute('''
                ALTER TABLE installations ADD COLUMN filial TEXT
            ''')
        except Exception:
            pass
        try:
            cursor.execute('''
                ALTER TABLE installations ADD COLUMN turno_preferencial TEXT
            ''')
        except Exception:
            pass
        try:
            cursor.execute('''
                INSERT INTO installations (client_id, client_name, installation_type, plan, request_date, due_date, attendant, turno_preferencial, observation, filial, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (installation['client_id'], installation['client_name'], installation['installation_type'],
                 installation['plan'], installation['request_date'], installation['due_date'].strftime('%Y-%m-%d'),
                 installation['attendant'], installation['turno_preferencial'], installation['observation'], installation['filial'], installation['created_by']))
            conn.commit()
        except Exception as e:
            print("Erro SQLite:", e)  # Debug
            conn.close()
            return jsonify({'success': False, 'message': 'Erro ao salvar a instalação.'})
        conn.close()
        
        due_date_str = installation['due_date'].strftime('%d/%m/%Y') if hasattr(installation['due_date'], 'strftime') else str(installation['due_date'])
        
        detalhes = []
        detalhes.append(f'Cliente: {installation["client_name"]} (ID: {installation["client_id"]})')
        detalhes.append(f'Tipo: {installation["installation_type"]}')
        detalhes.append(f'Plano: {installation["plan"]}')
        detalhes.append(f'Filial: {installation["filial"]}')
        detalhes.append(f'Data de Agendamento: {due_date_str}')
        
        if installation.get('request_date'):
            detalhes.append(f'Vencimento: {installation["request_date"]}')
        
        detalhes.append(f'Atendente: {installation["attendant"]}')
        
        if installation.get('turno_preferencial'):
            detalhes.append(f'Turno: {installation["turno_preferencial"]}')
        
        if installation.get('observation'):
            detalhes.append(f'Observação: {installation["observation"]}')
        
        log_action(
            current_user.id,
            'Adicionou instalação',
            ' | '.join(detalhes)
        )
        return jsonify({'success': True, 'message': 'Instalação adicionada com sucesso!'})
    return render_template('add_installation.html', current_user_name=current_user.name, limites=limites)

@app.route('/api/blocked_dates', methods=['GET'])
@login_required
def blocked_dates():
    config = get_config()
    limites_personalizados = config.get('limites_personalizados', {})
    conn = get_db_connection()
    cursor = conn.cursor()
    blocked = {'Caxias': [], 'Vilar': []}
    
    for filial in ['Caxias', 'Vilar']:
        if filial in limites_personalizados:
            for date_str, limite in limites_personalizados[filial].items():
                cursor.execute(
                    'SELECT COUNT(*) FROM installations WHERE filial = ? AND due_date = ?',
                    (filial, date_str)
                )
                count = cursor.fetchone()[0]
                if count >= limite:
                    blocked[filial].append(date_str)
    
    start_date = datetime.now()
    end_date = start_date + timedelta(days=365)
    current_date = start_date
    
    while current_date <= end_date:
        date_str = current_date.strftime('%Y-%m-%d')
        for filial in ['Caxias', 'Vilar']:
            if filial not in limites_personalizados or date_str not in limites_personalizados[filial]:
                limite = get_limit_for_date(filial, date_str)
                cursor.execute(
                    'SELECT COUNT(*) FROM installations WHERE filial = ? AND due_date = ?',
                    (filial, date_str)
                )
                count = cursor.fetchone()[0]
                if count >= limite:
                    if date_str not in blocked[filial]:
                        blocked[filial].append(date_str)
        current_date += timedelta(days=1)
    
    conn.close()
    return jsonify({'success': True, 'blocked_dates': blocked})


@app.route('/view_installations', endpoint='view_installations', methods=['GET'])
@login_required
@limiter.limit("40 per minute") #requisições limitadas a 40 por minuto
def view_installations():
    return render_template('view_installations.html')

@app.route('/api/installations', methods=['GET'])
@login_required
def get_installations():
    try:
        conn = get_db_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM installations ORDER BY id DESC')  # <-- sem filtro por created_by
        rows = cursor.fetchall()
        conn.close()
        installations = []
        for row in rows:
            installation = dict(row)
            installation['clientId'] = installation.pop('client_id')
            installation['clientName'] = installation.pop('client_name')
            installation['installationType'] = installation.pop('installation_type')
            installation['requestDate'] = installation.pop('request_date')
            installation['dueDate'] = installation.pop('due_date')
            installation['filial'] = installation.get('filial', '')  # Adiciona o campo filial
            installation['turno_preferencial'] = installation.get('turno_preferencial', '')  # Adiciona o campo turno_preferencial
            installations.append(installation)
        return jsonify({'success': True, 'installations': installations})
    except Exception as e:
        print(f"Error in get_installations: {str(e)}")
        return jsonify({'success': False, 'message': f'Erro no servidor: {str(e)}'}), 500


@app.route('/delete_installation/<int:id>', methods=['POST'])
@login_required
def delete_installation(id):
    print(f"Attempting to delete installation ID: {id}")  # Debug
    data = request.get_json(silent=True) or request.form
    reason = (data.get('reason') if data else '')
    reason = reason.strip() if isinstance(reason, str) else ''
    if not reason:
        return jsonify({'success': False, 'message': 'O motivo da exclusão é obrigatório.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT client_name, client_id FROM installations WHERE id = ?', (id,))
    client = cursor.fetchone()
    if not client:
        conn.close()
        print(f"Installation ID {id} not found")  # Debug
        return jsonify({'success': False, 'message': 'Instalação não encontrada.'})
    client_name = client['client_name']
    client_id = client['client_id']
    try:
        cursor.execute('DELETE FROM installations WHERE id = ?', (id,))
        conn.commit()
    except Exception as e:
        conn.close()
        print(f"SQLite error: {e}")  # Debug
        return jsonify({'success': False, 'message': 'Erro ao excluir instalação.'})
    conn.close()
    log_action(
        current_user.id,
        'Instalação excluída',
        f'Excluiu instalação do cliente: {client_name} (ID Cliente: {client_id}, ID Instalação: {id}) | Motivo: {reason} | Feito por: {current_user.name} (ID: {current_user.id})'
    )
    return jsonify({'success': True, 'message': 'Instalação excluída com sucesso!'})


@app.route('/api/installations/<int:id>', methods=['GET'])
@login_required
@csrf.exempt
def get_installation_by_id(id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM installations WHERE id = ?', (id,))
        installation = cursor.fetchone()
        conn.close()
        
        if not installation:
            return jsonify({'success': False, 'message': 'Serviço não encontrado.'}), 404
        
        installation_dict = dict(installation)
        installation_dict['clientId'] = installation_dict.pop('client_id')
        installation_dict['clientName'] = installation_dict.pop('client_name')
        installation_dict['installationType'] = installation_dict.pop('installation_type')

        request_date = installation_dict.pop('request_date')
        if request_date:
            try:
                date_parts = request_date.split('-')
                if len(date_parts) == 3:
                    installation_dict['requestDate'] = f"{date_parts[2]}/{date_parts[1]}/{date_parts[0]}"
                else:
                    installation_dict['requestDate'] = request_date
            except:
                installation_dict['requestDate'] = request_date
        else:
            installation_dict['requestDate'] = ''
        
        due_date = installation_dict.pop('due_date')
        if due_date:
            try:
                date_parts = due_date.split('-')
                if len(date_parts) == 3:
                    installation_dict['dueDate'] = f"{date_parts[2]}/{date_parts[1]}/{date_parts[0]}"
                else:
                    installation_dict['dueDate'] = due_date
            except:
                installation_dict['dueDate'] = due_date
        else:
            installation_dict['dueDate'] = ''
        
        return jsonify({'success': True, 'installation': installation_dict})
    except Exception as e:
        print(f"Error in get_installation_by_id: {str(e)}")
        return jsonify({'success': False, 'message': f'Erro no servidor: {str(e)}'}), 500


@app.route('/api/installations/client/<client_id>', methods=['GET'])
@login_required
@csrf.exempt
def get_installation_by_client_id(client_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM installations WHERE client_id = ? ORDER BY id DESC LIMIT 1', (client_id,))
        installation = cursor.fetchone()
        conn.close()
        
        if not installation:
            return jsonify({'success': False, 'message': 'Serviço não encontrado para este ID de cliente.'}), 404
        
        return format_installation_response(installation)
    except Exception as e:
        print(f"Error in get_installation_by_client_id: {str(e)}")
        return jsonify({'success': False, 'message': f'Erro no servidor: {str(e)}'}), 500


@app.route('/api/installations/search', methods=['GET'])
@login_required
@csrf.exempt
def search_installation_by_client():
    try:
        client_id = request.args.get('client_id', '').strip()
        client_name = request.args.get('client_name', '').strip()
        
        if not client_id and not client_name:
            return jsonify({'success': False, 'message': 'Por favor, informe o ID ou nome do cliente.'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if client_id:
            cursor.execute('SELECT * FROM installations WHERE client_id = ? ORDER BY id DESC LIMIT 1', (client_id,))
            installation = cursor.fetchone()
            if installation:
                conn.close()
                return format_installation_response(installation, 'ID do cliente')
        
        if client_name:
            cursor.execute('SELECT * FROM installations WHERE client_name LIKE ? ORDER BY id DESC LIMIT 1', (f'%{client_name}%',))
            installation = cursor.fetchone()
            if installation:
                conn.close()
                return format_installation_response(installation, 'nome do cliente')
        
        conn.close()
        search_term = client_id if client_id else client_name
        return jsonify({'success': False, 'message': f'Serviço não encontrado para {search_term}.'}), 404
        
    except Exception as e:
        print(f"Error in search_installation_by_client: {str(e)}")
        return jsonify({'success': False, 'message': f'Erro no servidor: {str(e)}'}), 500


def format_installation_response(installation, search_type=''):
    installation_dict = dict(installation)
    
    installation_dict['clientId'] = installation_dict.pop('client_id', '')
    installation_dict['clientName'] = installation_dict.pop('client_name', '')
    installation_dict['installationType'] = installation_dict.pop('installation_type', '')
    
    installation_dict['plan'] = installation_dict.get('plan', '')
    installation_dict['attendant'] = installation_dict.get('attendant', '')
    installation_dict['observation'] = installation_dict.get('observation', '')
    installation_dict['filial'] = installation_dict.get('filial', '')
    installation_dict['turno_preferencial'] = installation_dict.get('turno_preferencial', '')

    request_date = installation_dict.pop('request_date', None)
    if request_date:
        try:
            date_parts = request_date.split('-')
            if len(date_parts) == 3:
                installation_dict['requestDate'] = f"{date_parts[2]}/{date_parts[1]}/{date_parts[0]}"
            else:
                installation_dict['requestDate'] = request_date
        except:
            installation_dict['requestDate'] = request_date
    else:
        installation_dict['requestDate'] = ''
    
    due_date = installation_dict.pop('due_date', None)
    if due_date:
        try:
            date_parts = due_date.split('-')
            if len(date_parts) == 3:
                installation_dict['dueDate'] = f"{date_parts[2]}/{date_parts[1]}/{date_parts[0]}"
            else:
                installation_dict['dueDate'] = due_date
        except:
            installation_dict['dueDate'] = due_date
    else:
        installation_dict['dueDate'] = ''
    
    return jsonify({'success': True, 'installation': installation_dict})


@app.route('/api/installations/<int:id>', methods=['PUT'])
@login_required
@csrf.exempt
def update_installation(id):
    try:
        data = request.get_json()
        client_id = (data.get('client_id') or '').strip()
        client_name = (data.get('client_name') or '').strip()
        installation_type = (data.get('installation_type') or '').strip()
        plan = (data.get('plan') or '').strip()
        request_date = (data.get('request_date') or '').strip()
        due_date = data.get('due_date')
        attendant = (data.get('attendant') or '').strip()
        observation = data.get('observation', '')
        
        if not due_date:
            return jsonify({'success': False, 'message': 'Data de instalação é obrigatória.'}), 400
        
        try:
            due_date_parts = due_date.split('/')
            if len(due_date_parts) == 3:
                if len(due_date_parts[0]) == 4:
                    # Já está no formato correto
                    pass
                else:
                    due_date = f"{due_date_parts[2]}-{due_date_parts[1]}-{due_date_parts[0]}"
        except:
            return jsonify({'success': False, 'message': 'Formato de data inválido.'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM installations WHERE id = ?', (id,))
        installation = cursor.fetchone()
        if not installation:
            conn.close()
            return jsonify({'success': False, 'message': 'Serviço não encontrado.'}), 404
        
        old_due_date = installation['due_date']
        filial = installation['filial'] if 'filial' in installation.keys() else ''
        
        # Validar limite apenas se a data estiver sendo alterada
        if old_due_date != due_date:
            if not filial:
                conn.close()
                return jsonify({'success': False, 'message': 'Não é possível alterar a data: filial não encontrada.'}), 400
            
            # Obter o limite para a nova data
            max_por_dia = get_limit_for_date(filial, due_date)
            max_por_dia = int(max_por_dia) if max_por_dia is not None else 20
            
            # Verificar se o limite está configurado como 0
            if max_por_dia == 0:
                conn.close()
                try:
                    due_date_obj = datetime.strptime(due_date, '%Y-%m-%d')
                    due_date_formatted = due_date_obj.strftime('%d/%m/%Y')
                except:
                    due_date_formatted = due_date
                return jsonify({'success': False, 'message': f'Não é possível agendar instalações para {filial} no dia {due_date_formatted}. O limite está configurado como 0.'}), 400
            
            # Contar instalações na nova data (excluindo a própria instalação que está sendo editada)
            cursor.execute(
                'SELECT COUNT(*) FROM installations WHERE filial = ? AND due_date = ? AND id != ?',
                (filial, due_date, id)
            )
            count = cursor.fetchone()[0]
            
            # Verificar se o limite foi atingido
            if count >= max_por_dia:
                conn.close()
                try:
                    due_date_obj = datetime.strptime(due_date, '%Y-%m-%d')
                    due_date_formatted = due_date_obj.strftime('%d/%m/%Y')
                except:
                    due_date_formatted = due_date
                return jsonify({'success': False, 'message': f'Limite de {max_por_dia} instalações para {filial} no dia {due_date_formatted} atingido. Já existem {count} agendamentos.'}), 400
        
        cursor.execute('''
            UPDATE installations 
            SET client_id = ?, client_name = ?, installation_type = ?, plan = ?, request_date = ?, due_date = ?, attendant = ?, observation = ? 
            WHERE id = ?
        ''', (
            client_id or installation['client_id'],
            client_name or installation['client_name'],
            installation_type or installation['installation_type'],
            plan or installation['plan'],
            request_date if request_date != '' else installation['request_date'],
            due_date,
            attendant or installation['attendant'],
            observation,
            id,
        ))
        
        conn.commit()
        conn.close()
        
        log_action(
            current_user.id,
            'Serviço editado',
            f'Editou serviço do cliente: {installation["client_name"]} (ID Cliente: {installation["client_id"]}, ID Serviço: {id}) | Nova data: {due_date} | Feito por: {current_user.name} (ID: {current_user.id})'
        )
        
        return jsonify({'success': True, 'message': 'Serviço atualizado com sucesso!'})
    except Exception as e:
        print(f"Error in update_installation: {str(e)}")
        return jsonify({'success': False, 'message': f'Erro no servidor: {str(e)}'}), 500


@app.route('/api/installations/update', methods=['POST'])
@login_required
@csrf.exempt
def update_installation_modal():
    try:
        data = request.get_json()
        installation_id = data.get('id')
        client_id = (data.get('client_id') or '').strip()
        client_name = (data.get('client_name') or '').strip()
        installation_type = (data.get('installation_type') or '').strip()
        plan = (data.get('plan') or '').strip()
        request_date = (data.get('request_date') or '').strip()
        due_date = data.get('dueDate')
        attendant = (data.get('attendant') or '').strip()
        observation = data.get('observation', '')
        
        if not installation_id:
            return jsonify({'success': False, 'message': 'ID da instalação é obrigatório.'}), 400
        
        if not due_date:
            return jsonify({'success': False, 'message': 'Data de agendamento é obrigatória.'}), 400
        
        try:
            if '/' in due_date:
                due_date_parts = due_date.split('/')
                if len(due_date_parts) == 3:
                    if len(due_date_parts[0]) == 4:
                        pass
                    else:
                        due_date = f"{due_date_parts[2]}-{due_date_parts[1]}-{due_date_parts[0]}"
        except:
            return jsonify({'success': False, 'message': 'Formato de data inválido.'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM installations WHERE id = ?', (installation_id,))
        installation = cursor.fetchone()
        if not installation:
            conn.close()
            return jsonify({'success': False, 'message': 'Serviço não encontrado.'}), 404
        
        old_due_date = installation['due_date']
        old_observation = installation['observation'] or ''
        filial = installation['filial'] if 'filial' in installation.keys() else ''
        
        # Validar limite apenas se a data estiver sendo alterada
        if old_due_date != due_date:
            if not filial:
                conn.close()
                return jsonify({'success': False, 'message': 'Não é possível alterar a data: filial não encontrada.'}), 400
            
            # Obter o limite para a nova data
            max_por_dia = get_limit_for_date(filial, due_date)
            max_por_dia = int(max_por_dia) if max_por_dia is not None else 20
            
            # Verificar se o limite está configurado como 0
            if max_por_dia == 0:
                conn.close()
                try:
                    due_date_obj = datetime.strptime(due_date, '%Y-%m-%d')
                    due_date_formatted = due_date_obj.strftime('%d/%m/%Y')
                except:
                    due_date_formatted = due_date
                return jsonify({'success': False, 'message': f'Não é possível agendar instalações para {filial} no dia {due_date_formatted}. O limite está configurado como 0.'}), 400
            
            # Contar instalações na nova data (excluindo a própria instalação que está sendo editada)
            cursor.execute(
                'SELECT COUNT(*) FROM installations WHERE filial = ? AND due_date = ? AND id != ?',
                (filial, due_date, installation_id)
            )
            count = cursor.fetchone()[0]
            
            # Verificar se o limite foi atingido
            if count >= max_por_dia:
                conn.close()
                try:
                    due_date_obj = datetime.strptime(due_date, '%Y-%m-%d')
                    due_date_formatted = due_date_obj.strftime('%d/%m/%Y')
                except:
                    due_date_formatted = due_date
                return jsonify({'success': False, 'message': f'Limite de {max_por_dia} instalações para {filial} no dia {due_date_formatted} atingido. Já existem {count} agendamentos.'}), 400
        
        cursor.execute('''
            UPDATE installations 
            SET client_id = ?, client_name = ?, installation_type = ?, plan = ?, request_date = ?, due_date = ?, attendant = ?, observation = ? 
            WHERE id = ?
        ''', (
            client_id or installation['client_id'],
            client_name or installation['client_name'],
            installation_type or installation['installation_type'],
            plan or installation['plan'],
            request_date if request_date != '' else installation['request_date'],
            due_date,
            attendant or installation['attendant'],
            observation,
            installation_id,
        ))
        
        conn.commit()
        conn.close()
        
        log_details = []
        if old_due_date != due_date:
            log_details.append(f"Data: {old_due_date} → {due_date}")
        if old_observation != observation:
            log_details.append(f"Observação: '{old_observation}' → '{observation}'")
        
        log_action(
            current_user.id,
            'Serviço editado via modal',
            f'Cliente: {installation["client_name"]} (ID: {installation["client_id"]}) | Serviço ID: {installation_id} | Alterações: {", ".join(log_details)} | Feito por: {current_user.name} (ID: {current_user.id})'
        )
        
        return jsonify({'success': True, 'message': 'Serviço atualizado com sucesso!'})
    except Exception as e:
        print(f"Error in update_installation_modal: {str(e)}")
        return jsonify({'success': False, 'message': f'Erro no servidor: {str(e)}'}), 500


@app.route('/change_password', methods=['GET', 'POST'])
@login_required
def change_password():
    if request.method == 'POST':
        print("Form data:", dict(request.form))  # Debug
        try:
            new_password = request.form['newPassword']
            confirm_password = request.form['confirmPassword']
        except KeyError as e:
            print("Erro KeyError:", e)  # Debug
            flash(f'Campo ausente: {e.args[0]}', 'error')
            return redirect(url_for('change_password'))
        if new_password != confirm_password:
            print("Senhas não coincidem")  # Debug
            flash('As senhas não coincidem!', 'error')
            return redirect(url_for('change_password'))
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute('UPDATE users SET password = ? WHERE id = ?',
                           (generate_password_hash(new_password), current_user.id))
            conn.commit()
        except Exception as e:
            conn.close()
            print("Erro SQLite:", e)  # Debug
            flash('Erro ao alterar a senha.', 'error')
            return redirect(url_for('change_password'))
        conn.close()
        log_action(current_user.id, 'Changed password')
        flash('Senha alterada com sucesso!', 'success')
        return redirect(url_for('dashboard'))
    return render_template('change_password.html')


@app.route('/users', methods=['GET'])
@login_required
def manage_users():
    if current_user.type != 'admin':
        return redirect(url_for('dashboard', denied=1))
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users ORDER BY name ASC')
        users = cursor.fetchall()
        conn.close()
        form = AddUserForm()
        return render_template('manage_users.html', users=users, form=form)
    except Exception as e:
        print(f"Erro em manage_users: {str(e)}")
        return jsonify({'success': False, 'message': f'Erro no servidor: {str(e)}'}), 500


@app.route('/add_user', methods=['POST'])
@login_required
def add_user():
    conn = None
    try:
        form = AddUserForm()
        if form.validate_on_submit():
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('SELECT id FROM users WHERE login = ?', (form.login.data,))
            if cursor.fetchone():
                conn.close()
                print(f"Tentativa de criar usuário com login existente: {form.login.data}")
                return jsonify({'success': False, 'message': 'Este login já está em uso. Escolha outro.'}), 400
            hashed_password = generate_password_hash(form.password.data)
            cursor.execute(
                'INSERT INTO users (name, login, type, created_by, password) VALUES (?, ?, ?, ?, ?)',
                (form.name.data, form.login.data, form.type.data, current_user.id, hashed_password)
            )
            conn.commit()
            user_id = cursor.lastrowid
            conn.close()
            print(f"Usuário criado com sucesso: {form.login.data}, ID: {user_id}")
            log_action(
                current_user.id,
                'Adicionou usuário',
                f'Usuário criado: {form.login.data} (Nome: {form.name.data}, ID: {user_id}) | Feito por: {current_user.name} (ID: {current_user.id})'
            )
            return jsonify({'success': True, 'message': 'Usuário adicionado com sucesso!'})
        else:
            errors = form.errors
            print(f"Erros de validação do formulário: {errors}")
            return jsonify({'success': False, 'message': 'Erro de validação: ' + ', '.join([f"{k}: {v[0]}" for k, v in errors.items()])}), 400
    except Exception as e:
        print(f"Error in add_user: {str(e)}")
        return jsonify({'success': False, 'message': 'Este login já está em uso. Escolha outro.'}), 400
    except Exception as e:
        print(f"Error in add_user: {str(e)}")
        return jsonify({'success': False, 'message': f'Erro no servidor: {str(e)}'}), 500
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass

@app.route('/edit_user', methods=['POST'])
@login_required
@csrf.exempt
def edit_user():
    try:
        if current_user.type != 'admin':
            return jsonify({'success': False, 'message': 'Acesso negado.'}), 403
        
        user_id = request.form.get('id')
        name = request.form.get('name')
        login = request.form.get('login')
        password = request.form.get('password', '')
        user_type = request.form.get('type')

        if not all([user_id, name, login, user_type]):
            return jsonify({'success': False, 'message': 'Todos os campos obrigatórios devem ser preenchidos.'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT id FROM users WHERE login = ? AND id != ?', (login, user_id))
        if cursor.fetchone():
            conn.close()
            return jsonify({'success': False, 'message': 'Login já está em uso.'}), 400

        if password:
            cursor.execute(
                'UPDATE users SET name = ?, login = ?, password = ?, type = ? WHERE id = ?',
                (name, login, generate_password_hash(password), user_type, user_id)
            )
        else:
            cursor.execute(
                'UPDATE users SET name = ?, login = ?, type = ? WHERE id = ?',
                (name, login, user_type, user_id)
            )

        conn.commit()
        conn.close()
        log_action(current_user.id, f'Edited user {login}')
        return jsonify({'success': True, 'message': 'Usuário atualizado com sucesso!'})
    except Exception:
        conn.close()
        return jsonify({'success': False, 'message': 'Erro: Login já existe.'}), 400
    except Exception as e:
        conn.close()
        print(f"Error in edit_user: {str(e)}")
        return jsonify({'success': False, 'message': f'Erro no servidor: {str(e)}'}), 500


@app.route('/get_user/<int:user_id>', methods=['GET'])
@login_required
@csrf.exempt
def get_user(user_id):
    if current_user.type != 'admin':
        return jsonify({'success': False, 'message': 'Acesso negado.'})

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, name, login, type FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    conn.close()

    if user:
        return jsonify({'success': True, 'user': dict(user)})

    return jsonify({'success': False, 'message': 'Usuário não encontrado.'})

@app.route('/delete_user', methods=['POST'])
@login_required
@csrf.exempt
def delete_user():
    if current_user.type != 'admin':
        return jsonify({'success': False, 'message': 'Acesso negado.'})

    data = request.get_json()
    user_id = data.get('id')

    if not user_id:
        return jsonify({'success': False, 'message': 'ID do usuário não fornecido.'})

    if int(user_id) == current_user.id:
        return jsonify({'success': False, 'message': 'Você não pode excluir seu próprio usuário!'})

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT login, name FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()

    if user:
        cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
        conn.commit()
        conn.close()
        log_action(
            current_user.id,
            'Usuário excluído',
            f'Excluiu o usuário: {user["login"]} (Nome: {user["name"]}, ID: {user_id}) | Feito por: {current_user.name} (ID: {current_user.id})'
        )
        return jsonify({'success': True, 'message': 'Usuário excluído com sucesso!'})

    conn.close()
    return jsonify({'success': False, 'message': 'Usuário não encontrado.'})

@app.route('/user_logs')
@login_required
def user_logs():
    if current_user.type != 'admin':
        return redirect(url_for('dashboard', denied=1))

    usuario_id = request.args.get('usuario_id', '')
    usuario_nome = request.args.get('usuario', '').strip()
    data_inicio = request.args.get('data_inicio', '').strip()
    data_fim = request.args.get('data_fim', '').strip()
    data_especifica = request.args.get('data', '').strip()
    tipo_acao = request.args.get('tipo_acao', '').strip()
    palavra_chave = request.args.get('palavra_chave', '').strip().lower()

    tem_filtro = any([
        usuario_id,
        usuario_nome,
        data_inicio,
        data_fim,
        data_especifica,
        tipo_acao,
        palavra_chave
    ])

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, name FROM users ORDER BY name ASC')
    usuarios = [dict(id=row[0], name=row[1]) for row in cursor.fetchall()]

    logs = []
    
    if tem_filtro:
        query = '''
            SELECT ul.id, ul.user_id, ul.action, ul.timestamp, ul.ip_address, ul.user_agent, u.name
            FROM user_logs ul
            JOIN users u ON ul.user_id = u.id
            WHERE 1=1
        '''
        params = []

        usuario_id_valido = False
        if usuario_id:
            try:
                query += ' AND ul.user_id = ?'
                params.append(int(usuario_id))
                usuario_id_valido = True
            except (ValueError, TypeError):
                pass
        
        if usuario_nome and not usuario_id_valido:
            query += ' AND LOWER(u.name) LIKE ?'
            params.append(f'%{usuario_nome.lower()}%')

        if data_especifica:
            query += ' AND ul.timestamp LIKE ?'
            params.append(f'{data_especifica}%')
        else:
            if data_inicio:
                query += ' AND ul.timestamp >= ?'
                params.append(f'{data_inicio} 00:00:00')
            if data_fim:
                query += ' AND ul.timestamp <= ?'
                params.append(f'{data_fim} 23:59:59')
        if tipo_acao:
            tipo_acao_lower = tipo_acao.lower()
            if tipo_acao_lower == 'login':
                query += ' AND LOWER(ul.action) LIKE ?'
                params.append('%login%')
            elif tipo_acao_lower == 'logout':
                query += ' AND LOWER(ul.action) LIKE ?'
                params.append('%logout%')
            elif tipo_acao_lower == 'instalação':
                query += ' AND (LOWER(ul.action) LIKE ? OR LOWER(ul.action) LIKE ? OR LOWER(ul.action) LIKE ?)'
                params.extend(['%adicionou instalação%', '%instalação excluída%', '%serviço editado%'])
            elif tipo_acao_lower == 'usuário':
                query += ' AND (LOWER(ul.action) LIKE ? OR LOWER(ul.action) LIKE ? OR LOWER(ul.action) LIKE ?)'
                params.extend(['%adicionou usuário%', '%usuário excluído%', '%edited user%'])
            elif tipo_acao_lower == 'senha':
                query += ' AND (LOWER(ul.action) LIKE ? OR LOWER(ul.action) LIKE ?)'
                params.extend(['%changed password%', '%senha%'])
            elif tipo_acao_lower == 'configuração':
                query += ' AND (LOWER(ul.action) LIKE ? OR LOWER(ul.action) LIKE ?)'
                params.extend(['%limite%', '%configuração%'])

        if palavra_chave:
            query += ' AND LOWER(ul.action) LIKE ?'
            params.append(f'%{palavra_chave}%')

        query += ' ORDER BY ul.timestamp DESC LIMIT 1000'

        cursor.execute(query, params)
        logs = []
        for row in cursor.fetchall():
            logs.append({
                'id': row[0],
                'user_id': row[1],
                'action': row[2],
                'timestamp': row[3],
                'ip_address': row[4] if len(row) > 4 else None,
                'user_agent': row[5] if len(row) > 5 else None,
                'name': row[6] if len(row) > 6 else row[4]  # Compatibilidade com versão antiga
            })

    conn.close()

    return render_template('user_logs.html', logs=logs, usuarios=usuarios, 
                         usuario_id=usuario_id, usuario_nome=usuario_nome,
                         data_inicio=data_inicio, data_fim=data_fim,
                         data_especifica=data_especifica, tipo_acao=tipo_acao,
                         palavra_chave=palavra_chave, tem_filtro=tem_filtro)

@app.route('/api/log_details/<int:log_id>', methods=['GET'])
@login_required
@csrf.exempt
def get_log_details(log_id):
    if current_user.type != 'admin':
        return jsonify({'success': False, 'message': 'Acesso negado.'}), 403
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT ul.id, ul.user_id, ul.action, ul.timestamp, ul.ip_address, ul.user_agent, u.name
        FROM user_logs ul
        JOIN users u ON ul.user_id = u.id
        WHERE ul.id = ?
    ''', (log_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return jsonify({'success': False, 'message': 'Log não encontrado.'}), 404
    
    log_data = {
        'id': row[0],
        'user_id': row[1],
        'action': row[2],
        'timestamp': row[3],
        'ip_address': row[4] or 'N/A',
        'user_agent': row[5] or 'N/A',
        'user_name': row[6]
    }
    
    return jsonify({'success': True, 'log': log_data})

@app.route('/relatorios', methods=['GET'])
@login_required
def relatorios():
    return render_template('relatorios.html')

@app.template_filter('format_date')
def format_date(date_string):
    if not date_string:
        return ""
    date = datetime.strptime(date_string, '%Y-%m-%d')
    return date.strftime('%d/%m/%Y')

@app.template_filter('ord')
def ord_filter(value):
    return ord(value)

@app.route('/api/relatorios', methods=['GET'])
@login_required
def api_relatorios():
    dia = request.args.get('dia')
    mes = request.args.get('mes')
    ano = request.args.get('ano')
    query = 'SELECT * FROM installations WHERE 1=1'
    params = []
    if dia:
        query += ' AND due_date = ?'
        params.append(dia)
    elif mes and ano:
        query += ' AND due_date LIKE ?'
        params.append(f'{ano}-{mes.zfill(2)}-%')
    elif ano:
        query += ' AND due_date LIKE ?'
        params.append(f'{ano}-%')
    query += ' ORDER BY id DESC'
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    installations = []
    for row in rows:
        installation = dict(row)
        installation['clientId'] = installation.pop('client_id')
        installation['clientName'] = installation.pop('client_name')
        installation['installationType'] = installation.pop('installation_type')
        installation['requestDate'] = installation.pop('request_date')
        installation['dueDate'] = installation.pop('due_date')
        installation['filial'] = installation.get('filial', '')
        installation['turno_preferencial'] = installation.get('turno_preferencial', '')
        installations.append(installation)
    return jsonify({'success': True, 'installations': installations})

@app.route('/api/relatorios/csv', methods=['GET'])
@login_required
def exportar_csv():
    dia = request.args.get('dia')
    mes = request.args.get('mes')
    ano = request.args.get('ano')
    query = 'SELECT * FROM installations WHERE 1=1'
    params = []
    if dia:
        query += ' AND due_date = ?'
        params.append(dia)
    elif mes and ano:
        query += ' AND due_date LIKE ?'
        params.append(f'{ano}-{mes.zfill(2)}-%')
    elif ano:
        query += ' AND due_date LIKE ?'
        params.append(f'{ano}-%')
    query += ' ORDER BY id DESC'
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID Cliente', 'Nome Cliente', 'Serviço', 'Plano', 'Filial', 'Agendamento', 'Vencimento', 'Atendente', 'Turno Preferencial', 'Observação'])
    for row in rows:
        writer.writerow([
            row['client_id'], row['client_name'], row['installation_type'], row['plan'], row['filial'] if 'filial' in row.keys() else '', row['due_date'], row['request_date'], row['attendant'], row['turno_preferencial'] if 'turno_preferencial' in row.keys() else '', row['observation']
        ])
    output.seek(0)
    return send_file(io.BytesIO(output.getvalue().encode('utf-8')), mimetype='text/csv', as_attachment=True, download_name='relatorio.csv')

@app.route('/api/relatorios/excel', methods=['GET'])
@login_required
def exportar_excel():
    dia = request.args.get('dia')
    mes = request.args.get('mes')
    ano = request.args.get('ano')
    query = 'SELECT * FROM installations WHERE 1=1'
    params = []
    if dia:
        query += ' AND due_date = ?'
        params.append(dia)
    elif mes and ano:
        query += ' AND due_date LIKE ?'
        params.append(f'{ano}-{mes.zfill(2)}-%')
    elif ano:
        query += ' AND due_date LIKE ?'
        params.append(f'{ano}-%')
    query += ' ORDER BY id DESC'
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output, {'in_memory': True})
    worksheet = workbook.add_worksheet('Relatório')
    headers = ['ID Cliente', 'Nome Cliente', 'Serviço', 'Plano', 'Filial', 'Agendamento', 'Vencimento', 'Atendente', 'Turno Preferencial', 'Observação']
    for col, header in enumerate(headers):
        worksheet.write(0, col, header)
    for row_idx, row in enumerate(rows, 1):
        worksheet.write(row_idx, 0, row['client_id'])
        worksheet.write(row_idx, 1, row['client_name'])
        worksheet.write(row_idx, 2, row['installation_type'])
        worksheet.write(row_idx, 3, row['plan'])
        worksheet.write(row_idx, 4, row['filial'] if 'filial' in row.keys() else '')
        worksheet.write(row_idx, 5, row['due_date'])
        worksheet.write(row_idx, 6, row['request_date'])
        worksheet.write(row_idx, 7, row['attendant'])
        worksheet.write(row_idx, 8, row['turno_preferencial'] if 'turno_preferencial' in row.keys() else '')
        worksheet.write(row_idx, 9, row['observation'])
    workbook.close()
    output.seek(0)
    return send_file(output, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', as_attachment=True, download_name='relatorio.xlsx')

@app.route('/api/relatorios/pdf', methods=['GET'])
@login_required
def exportar_pdf():
    dia = request.args.get('dia')
    mes = request.args.get('mes')
    ano = request.args.get('ano')
    query = 'SELECT * FROM installations WHERE 1=1'
    params = []
    if dia:
        query += ' AND due_date = ?'
        params.append(dia)
    elif mes and ano:
        query += ' AND due_date LIKE ?'
        params.append(f'{ano}-{mes.zfill(2)}-%')
    elif ano:
        query += ' AND due_date LIKE ?'
        params.append(f'{ano}-%')
    query += ' ORDER BY id DESC'
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    pdf = FPDF(orientation='L', unit='mm', format='A4')
    pdf.add_page()
    pdf.set_fill_color(255, 140, 0)  # Laranja
    pdf.set_text_color(255, 255, 255)
    pdf.set_font('Arial', 'B', 20)
    pdf.cell(0, 15, 'Relatorio Netflex', 0, 1, 'C', fill=True)
    pdf.ln(2)
    pdf.set_font('Arial', '', 11)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 8, f'Data de emissão: {datetime.now().strftime("%d/%m/%Y %H:%M")}', 0, 1, 'R')
    pdf.cell(0, 8, f'Quantidade de registros: {len(rows)}', 0, 1, 'R')
    pdf.ln(2)

    headers = ['ID Cliente', 'Nome Cliente', 'Serviço', 'Plano', 'Filial', 'Agendamento', 'Vencimento', 'Atendente', 'Turno Preferencial', 'Observação']
    col_widths = [25, 40, 30, 25, 25, 30, 30, 30, 25, 45]
    pdf.set_font('Arial', 'B', 8)
    pdf.set_fill_color(255, 140, 0)
    pdf.set_text_color(255, 255, 255)
    for i, header in enumerate(headers):
        pdf.cell(col_widths[i], 7, header, 1, 0, 'C', fill=True)
    pdf.ln()
    pdf.set_font('Arial', '', 7)
    pdf.set_text_color(0, 0, 0)
    fill = False
    for idx, row in enumerate(rows):
        if idx % 2 == 0:
            pdf.set_fill_color(245, 245, 245)  # cinza claro
        else:
            pdf.set_fill_color(255, 255, 255)  # branco
        pdf.cell(col_widths[0], 7, str(row['client_id']), 1, 0, 'L', fill=True)
        pdf.cell(col_widths[1], 7, str(row['client_name']), 1, 0, 'L', fill=True)
        pdf.cell(col_widths[2], 7, str(row['installation_type']), 1, 0, 'L', fill=True)
        pdf.cell(col_widths[3], 7, str(row['plan']), 1, 0, 'L', fill=True)
        pdf.cell(col_widths[4], 7, str(row['filial'] if 'filial' in row.keys() else ''), 1, 0, 'L', fill=True)
        pdf.cell(col_widths[5], 7, str(row['due_date']), 1, 0, 'L', fill=True)
        pdf.cell(col_widths[6], 7, str(row['request_date']), 1, 0, 'L', fill=True)
        pdf.cell(col_widths[7], 7, str(row['attendant']), 1, 0, 'L', fill=True)
        pdf.cell(col_widths[8], 7, str(row['turno_preferencial'] if 'turno_preferencial' in row.keys() else ''), 1, 0, 'L', fill=True)
        pdf.cell(col_widths[9], 7, str(row['observation']), 1, 0, 'L', fill=True)
        pdf.ln()

    pdf.set_y(-15)
    pdf.set_font('Arial', 'I', 8)
    pdf.set_text_color(255, 140, 0)
    pdf.cell(0, 10, 'Relatorio Netflex - Gerado em ' + datetime.now().strftime('%d/%m/%Y %H:%M'), 0, 0, 'C')
    output = io.BytesIO()
    pdf_str = pdf.output(dest='S')
    if isinstance(pdf_str, (bytes, bytearray)):
        pdf_str = pdf_str.decode('latin1')
    pdf_bytes = pdf_str.encode('latin1')
    output.write(pdf_bytes)
    output.seek(0)
    return send_file(output, mimetype='application/pdf', as_attachment=True, download_name='relatorio.pdf')

@app.route('/recuperar', methods=['POST'])
def recuperar():
    login = request.form.get('login') or request.form.get('email')
    print("Recebido POST para recuperação, login:", login)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE login = ?', (login,))
    user = cursor.fetchone()
    conn.close()
    if not user:
        return jsonify({'success': False, 'message': 'Login não encontrado!'}), 400
    token = s.dumps(login, salt='recuperar-senha')
    link = url_for('redefinir', token=token, _external=True)
    msg = Message('Recuperação de Senha', sender=app.config['MAIL_USERNAME'], recipients=[login])
    msg.body = (
        f"Olá! {user['name']} 🙂,\n\n"
        f"Recebemos uma solicitação para redefinir a senha do seu acesso ao sistema Netflex.\n\n"
        f"Para criar uma nova senha, clique no link abaixo:\n{link}\n\n"
        f"Se você não solicitou a redefinição, ignore este e-mail. O link é válido por 1 hora.\n\n"
        f"Atenciosamente,\nEquipe Netflex ♻️\n\n"
        
    )
    try:
        mail.send(msg)
        return jsonify({'success': True, 'message': 'Você receberá um link no seu e-mail para alteração de senha.'})
    except Exception as e:
        return jsonify({'success': False, 'message': 'Erro ao enviar e-mail. Contate o suporte.'}), 500

@app.route('/redefinir/<token>', methods=['GET', 'POST'])
def redefinir(token):
    try:
        login = s.loads(token, salt='recuperar-senha', max_age=3600)
    except SignatureExpired:
        return 'O link expirou!', 400
    if request.method == 'POST':
        nova_senha = request.form['senha']
        confirma = request.form['confirma']
        if nova_senha != confirma:
            flash('As senhas não coincidem!', 'error')
            return redirect(request.url)
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('UPDATE users SET password = ? WHERE login = ?', (generate_password_hash(nova_senha), login))
        conn.commit()
        conn.close()
        flash('Senha alterada com sucesso!', 'success')
        return redirect(url_for('redefinir', token=token, sucesso=1))
    return render_template('redefinir.html', login=login)

@app.route('/api/ixc_cliente_nome')
@login_required
def api_ixc_cliente_nome():
    id_cliente = request.args.get('id')
    if not id_cliente:
        return jsonify({'success': False, 'message': 'ID do cliente não informado.'}), 400
    try:
        conn = http.client.HTTPSConnection("ixc.netflexisp.com.br")
        payload = json.dumps({
            "qtype": "cliente.id",
            "query": id_cliente,
            "oper": "=",
            "page": "1",
            "rp": "2000",
            "sortname": "cliente.id",
            "sortorder": "asc"
        })
        headers = {
            'ixcsoft': ' listar',
            'Authorization': IXC_AUTH,
            'Content-Type': ' application/json',
        }
        conn.request("GET", "/webservice/v1/cliente", payload, headers)
        res = conn.getresponse()
        data = res.read()
        json_data = json.loads(data.decode("utf-8"))
        if 'registros' in json_data and json_data['registros']:
            razao = json_data['registros'][0].get('razao', '')
            return jsonify({'success': True, 'razao': razao})
        else:
            return jsonify({'success': False, 'message': 'Cliente não encontrado.'}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': 'Erro ao consultar IXC.'}), 500

@app.route('/configuracoes')
@login_required
def configuracoes():
    if current_user.type != 'admin':
        return redirect(url_for('dashboard', denied=1))
    return render_template('configuracoes.html')

@app.route('/api/configuracoes', methods=['GET', 'POST'])
@csrf.exempt
@login_required
def api_configuracoes():
    if request.method == 'GET':
        return jsonify(get_config())
    if current_user.type != 'admin':
        return jsonify({'success': False, 'message': 'Acesso negado.'}), 403
    data = request.get_json()
    config = get_config()
    if 'limite_diario' in data:
        limites_antigos = config.get('limite_diario', {})
        limites_novos = data['limite_diario']
        detalhes = []
        for filial, dias_novos in limites_novos.items():
            dias_antigos = limites_antigos.get(filial, {})
            for dia, valor_novo in dias_novos.items():
                valor_antigo = dias_antigos.get(dia, None)
                if valor_antigo != valor_novo:
                    detalhes.append(f"{filial} {dia}: {valor_antigo} → {valor_novo}")
        if detalhes:
            log_action(
                current_user.id,
                'Editou limites diários padrão',
                f"Alterações: {', '.join(detalhes)} | Feito por: {current_user.name} (ID: {current_user.id})"
            )
        config['limite_diario'] = limites_novos
        save_config(config)
        return jsonify({'success': True, 'message': 'Configurações salvas com sucesso!'})
    if 'limites_personalizados' in data:
        limites_antigos = config.get('limites_personalizados', {})
        limites_novos = data['limites_personalizados']
        
        limites_novos_formatados = {}
        for filial, datas in limites_novos.items():
            limites_novos_formatados[filial] = {}
            for data_str, valor_novo in datas.items():
                try:
                    limites_novos_formatados[filial][data_str] = int(valor_novo)
                except (ValueError, TypeError):
                    continue
        
        detalhes = []
        for filial, datas in limites_novos_formatados.items():
            datas_antigas = limites_antigos.get(filial, {})
            for data_str, valor_novo in datas.items():
                valor_antigo = datas_antigas.get(data_str, None)
                if valor_antigo != valor_novo:
                    detalhes.append(f"{filial} {data_str}: {valor_antigo if valor_antigo is not None else 'padrão'} → {valor_novo}")
        if detalhes:
            log_action(
                current_user.id,
                'Editou limites personalizados',
                f"Alterações: {', '.join(detalhes)} | Feito por: {current_user.name} (ID: {current_user.id})"
            )
        config['limites_personalizados'] = limites_novos_formatados
        save_config(config)
        return jsonify({'success': True, 'message': 'Limites personalizados salvos com sucesso!'})
    if 'remover_limite_personalizado' in data:
        filial = data.get('filial')
        date_str = data.get('date')
        
        if not filial or not date_str:
            return jsonify({'success': False, 'message': 'Filial e data são obrigatórios.'}), 400
        
        if 'limites_personalizados' not in config:
            config['limites_personalizados'] = {}
        if filial not in config['limites_personalizados']:
            config['limites_personalizados'][filial] = {}
        
        if date_str in config['limites_personalizados'][filial]:
            del config['limites_personalizados'][filial][date_str]
            
            if len(config['limites_personalizados'][filial]) == 0:
                del config['limites_personalizados'][filial]
            
            save_config(config)
            log_action(
                current_user.id,
                'Removeu limite personalizado',
                f"{filial} {date_str} | Feito por: {current_user.name} (ID: {current_user.id})"
            )
            return jsonify({'success': True, 'message': 'Limite personalizado removido com sucesso!'})
        else:
            return jsonify({'success': False, 'message': 'Limite personalizado não encontrado para esta data.'}), 404
    if 'feriados' in data:
        config['feriados'] = data['feriados']
        save_config(config)
        return jsonify({'success': True, 'message': 'Feriados salvos com sucesso!'})
    if 'planos' in data:
        old_plans = set(config.get('planos', []))
        new_plans_list = data['planos']
        new_plans = set(new_plans_list)
        
        added = new_plans - old_plans
        removed = old_plans - new_plans
        
        details = []
        if added:
            details.append(f"Adicionado: {', '.join(added)}")
        if removed:
            details.append(f"Removido: {', '.join(removed)}")
            
        if details:
            log_action(
                current_user.id,
                'Alterou Planos',
                f"{' | '.join(details)} | Feito por: {current_user.name} (ID: {current_user.id})"
            )
            
        config['planos'] = new_plans_list
        save_config(config)
        return jsonify({'success': True, 'message': 'Planos salvos com sucesso!'})
    return jsonify({'success': False, 'message': 'Dados inválidos.'}), 400

CONFIG_PATH = 'config.json'
def get_config():
    if not os.path.exists(CONFIG_PATH):
        return {
            'limite_diario': {
                'Caxias': {'seg': 20, 'ter': 20, 'qua': 20, 'qui': 20, 'sex': 20, 'sab': 5, 'dom': 5},
                'Vilar': {'seg': 20, 'ter': 20, 'qua': 20, 'qui': 20, 'sex': 20, 'sab': 5, 'dom': 5},
            },
            'limites_personalizados': {},
            'planos': [
                "20MB", "50MB", "70MB", "90MB", "300MB", "500MB", "600MB", "800MB", "1000MB",
                "600MB PRÉ-PAGO", "300MB + Telefonia", "500MB + Telefonia", "600MB + Telefonia",
                "800MB + Telefonia", "1000MB + Telefonia", "Telefonia", "30MB FUNCIONARIO"
            ]
        }
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        config = json.load(f)
        if 'limites_personalizados' not in config:
            config['limites_personalizados'] = {}
        if 'planos' not in config:
            config['planos'] = [
                "20MB", "50MB", "70MB", "90MB", "300MB", "500MB", "600MB", "800MB", "1000MB",
                "600MB PRÉ-PAGO", "300MB + Telefonia", "500MB + Telefonia", "600MB + Telefonia",
                "800MB + Telefonia", "1000MB + Telefonia", "Telefonia", "30MB FUNCIONARIO"
            ]
        return config

def get_limit_for_date(filial, date_str):
    """Retorna o limite para uma data específica, verificando primeiro limites personalizados"""
    config = get_config()
    
    limites_personalizados = config.get('limites_personalizados', {})
    if filial in limites_personalizados and date_str in limites_personalizados[filial]:
        limite = limites_personalizados[filial][date_str]
        return int(limite) if limite is not None else None
    
    date_obj = datetime.strptime(date_str, '%Y-%m-%d')
    dias_semana = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']
    dia_semana_key = dias_semana[date_obj.weekday()]
    
    limites = config.get('limite_diario', {})
    filial_limites = limites.get(filial, {})
    limite_padrao = filial_limites.get(dia_semana_key, 20)
    return int(limite_padrao) if limite_padrao is not None else 20
def save_config(config):
    with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

with app.app_context():
    init_db()

def senha_forte(senha):
    import re
    if (len(senha) < 8 or
        not re.search(r'[A-Z]', senha) or
        not re.search(r'[a-z]', senha) or
        not re.search(r'[0-9]', senha) or
        not re.search(r'[^A-Za-z0-9]', senha)):
        return False
    return True

@csrf.exempt
@app.route('/trocar_senha_primeiro', methods=['GET', 'POST'])
@login_required
def trocar_senha_primeiro():
    if request.method == 'POST':
        nova_senha = request.form['senha']
        confirma = request.form['confirma']
        if nova_senha != confirma:
            return render_template('trocar_senha_primeiro.html', user=current_user, erro='As senhas não coincidem!')
        if not senha_forte(nova_senha):
            return render_template('trocar_senha_primeiro.html', user=current_user, erro='A senha deve ter pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais.')
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?', (generate_password_hash(nova_senha), current_user.id))
        conn.commit()
        conn.close()
        return render_template('trocar_senha_primeiro.html', user=current_user, sucesso=True)
    return render_template('trocar_senha_primeiro.html', user=current_user)

@app.before_request
def forcar_troca_senha():
    from flask import request
    if not current_user.is_authenticated:
        return
    allowed_endpoints = [
        'trocar_senha_primeiro', 'logout', 'login', 'static', 'favicon', 'redefinir', 'recuperar'
    ]
    if request.endpoint in allowed_endpoints or (request.endpoint and request.endpoint.startswith('static')):
        return
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT must_change_password FROM users WHERE id = ?', (current_user.id,))
    row = cursor.fetchone()
    conn.close()
    if row and str(row['must_change_password']) == '1':
        return redirect(url_for('trocar_senha_primeiro'))

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8001, debug=True)