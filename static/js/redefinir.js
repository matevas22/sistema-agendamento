document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('redefinirForm');
  const senha = document.getElementById('senha');
  const confirma = document.getElementById('confirma');
  const msgDiv = document.getElementById('redefinir-message');
  const forcaDiv = document.getElementById('forca-senha');
  const darkBtn = document.getElementById('toggle-dark');

  // Função para mostrar/ocultar senha
  window.toggleSenha = function(id, btn) {
    const input = document.getElementById(id);
    if (input.type === 'password') {
      input.type = 'text';
      btn.querySelector('i').classList.remove('fa-eye');
      btn.querySelector('i').classList.add('fa-eye-slash');
    } else {
      input.type = 'password';
      btn.querySelector('i').classList.remove('fa-eye-slash');
      btn.querySelector('i').classList.add('fa-eye');
    }
  };

  // Função para alternar modo dark/light
  window.toggleDarkMode = function() {
    document.body.classList.toggle('dark');
    const icon = darkBtn.querySelector('i');
    if (document.body.classList.contains('dark')) {
      icon.classList.remove('fa-moon');
      icon.classList.add('fa-sun');
      localStorage.setItem('netflex_dark', '1');
    } else {
      icon.classList.remove('fa-sun');
      icon.classList.add('fa-moon');
      localStorage.setItem('netflex_dark', '0');
    }
  };

  // Carregar preferência do modo
  if (localStorage.getItem('netflex_dark') === '1') {
    document.body.classList.add('dark');
    darkBtn.querySelector('i').classList.remove('fa-moon');
    darkBtn.querySelector('i').classList.add('fa-sun');
  }

  // Função para checar força da senha
  function checarForcaSenha(s) {
    let forca = 0;
    if (s.length >= 8) forca++;
    if (/[A-Z]/.test(s)) forca++;
    if (/[a-z]/.test(s)) forca++;
    if (/[0-9]/.test(s)) forca++;
    if (/[^A-Za-z0-9]/.test(s)) forca++;
    return forca;
  }

  senha.addEventListener('input', function() {
    const valor = senha.value;
    const forca = checarForcaSenha(valor);
    if (!valor) {
      forcaDiv.textContent = '';
      forcaDiv.className = 'forca-senha';
      return;
    }
    if (forca <= 2) {
      forcaDiv.textContent = 'Senha fraca';
      forcaDiv.className = 'forca-senha fraca';
    } else if (forca === 3 || forca === 4) {
      forcaDiv.textContent = 'Senha média';
      forcaDiv.className = 'forca-senha media';
    } else {
      forcaDiv.textContent = 'Senha forte';
      forcaDiv.className = 'forca-senha forte';
    }
  });

  form.addEventListener('submit', function(e) {
    msgDiv.textContent = '';
    if (senha.value !== confirma.value) {
      e.preventDefault();
      msgDiv.textContent = 'As senhas não coincidem!';
      senha.classList.add('error');
      confirma.classList.add('error');
      return false;
    }
    senha.classList.remove('error');
    confirma.classList.remove('error');
    // Checar força mínima
    if (checarForcaSenha(senha.value) < 3) {
      e.preventDefault();
      msgDiv.textContent = 'A senha deve ser mais forte (mínimo 8 caracteres, letras maiúsculas, minúsculas, números e símbolos).';
      senha.classList.add('error');
      return false;
    }
  });
});
