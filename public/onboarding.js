(function(){
'use strict';

var $ = function(id){ return document.getElementById(id); };
var form = $('obForm');
var nameInput = $('nameInput');
var bioInput = $('bioInput');
var bioCount = $('bioCount');
var avatarInput = $('avatarInput');
var avatarPreview = $('avatarPreview');
var avatarInitial = $('avatarInitial');
var avatarLabel = $('avatarLabel');
var errorBox = $('obError');
var btnSubmit = $('btnSubmit');

var selectedFile = null;

function showError(msg){
  errorBox.textContent = msg;
  errorBox.hidden = false;
}

function hideError(){ errorBox.hidden = true; }

// Load user current
fetch('/api/auth/me', { credentials:'same-origin', cache:'no-store' })
  .then(function(r){ return r.json(); })
  .then(function(j){
    if(!j || !j.ok || !j.logged_in){
      location.replace('/login');
      return;
    }
    var u = j.user || {};
    if(u.name) nameInput.value = u.name;
    if(u.bio) bioInput.value = u.bio;
    updateInitial();
    updateBioCount();
    // Kalau udah onboarded, redirect langsung
    if(u.onboarded === 1){
      location.replace('/home');
    }
  })
  .catch(function(){ location.replace('/login'); });

function updateInitial(){
  var n = (nameInput.value || '').trim();
  var initial = n ? n.charAt(0).toUpperCase() : 'U';
  avatarInitial.textContent = initial;
}

function updateBioCount(){
  bioCount.textContent = (bioInput.value || '').length;
}

nameInput.addEventListener('input', updateInitial);
bioInput.addEventListener('input', updateBioCount);

// Avatar preview
avatarInput.addEventListener('change', function(){
  var f = this.files && this.files[0];
  if(!f) return;
  if(!/^image\//.test(f.type)){
    showError('File harus berupa gambar');
    this.value = '';
    return;
  }
  if(f.size > 2 * 1024 * 1024){
    showError('Ukuran gambar max 2 MB');
    this.value = '';
    return;
  }
  hideError();
  selectedFile = f;
  avatarLabel.textContent = 'Ganti Foto';

  var reader = new FileReader();
  reader.onload = function(e){
    avatarPreview.innerHTML = '<img src="' + e.target.result + '" alt="">';
  };
  reader.readAsDataURL(f);
});

// Submit
form.addEventListener('submit', async function(e){
  e.preventDefault();
  hideError();

  var name = (nameInput.value || '').trim();
  var bio = (bioInput.value || '').trim();

  if(!name || name.length < 2){
    showError('Nama minimal 2 karakter');
    nameInput.focus();
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Menyimpan...';

  try {
    // Upload avatar kalau ada
    if(selectedFile){
      try {
        var fd = new FormData();
        fd.append('avatar', selectedFile);
        var r1 = await fetch('/api/user/avatar-upload', {
          method:'POST',
          credentials:'same-origin',
          body: fd
        });
        var j1 = await r1.json();
        if(!j1 || !j1.ok){
          console.warn('[Onboarding] Avatar upload gagal:', j1 && j1.message);
          // lanjut aja, avatar opsional
        }
      } catch(err) {
        console.warn('[Onboarding] Avatar error:', err.message);
      }
    }

    // Complete onboarding
    var r2 = await fetch('/api/user/complete-onboarding', {
      method:'POST',
      credentials:'same-origin',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name: name, bio: bio })
    });
    var j2 = await r2.json();

    if(!j2 || !j2.ok){
      showError((j2 && j2.message) || 'Gagal simpan profil');
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Simpan & Mulai';
      return;
    }

    btnSubmit.textContent = 'Berhasil! Mengalihkan...';
    setTimeout(function(){ location.replace('/home'); }, 500);

  } catch(err){
    showError('Koneksi error: ' + err.message);
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Simpan & Mulai';
  }
});

console.log('[Onboarding] Loaded');
})();
