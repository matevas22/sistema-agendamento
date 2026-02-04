function senhaForte(senha) {
  return senha.length >= 8 &&
    /[A-Z]/.test(senha) &&
    /[a-z]/.test(senha) &&
    /[0-9]/.test(senha) &&
    /[^A-Za-z0-9]/.test(senha);
}

document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('trocarSenhaPrimeiroForm');
  if (form) {
    form.addEventListener('submit', function(e) {
      const senha = document.getElementById('senha').value;
      const confirma = document.getElementById('confirma').value;
      if (senha !== confirma) {
        e.preventDefault();
        alert('As senhas não coincidem!');
        document.getElementById('confirma').focus();
        return;
      }
      if (!senhaForte(senha)) {
        e.preventDefault();
        alert('A senha deve ter pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais.');
        document.getElementById('senha').focus();
        return;
      }
    });
  }
});
