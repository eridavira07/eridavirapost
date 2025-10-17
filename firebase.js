// firebase.js (VERSI UNTUK HEADER WALLPAPER DARI LINK ADMIN + KONTROL FOKUS TERPISAH)

// --- Konfigurasi dan Setup Firebase (Ganti dengan detail Anda!) ---
const firebaseConfig = {
    apiKey: "AIzaSyC6eQQ5KmfNeE-MbbGztfgxUr-Q388K",
    authDomain: "anon-chat-eri.firebaseapp.com",
    databaseURL: "https://anon-chat-eri-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "anon-chat-eri",
    storageBucket: "anon-chat-eri.appspot.com",
    messagingSenderId: "770226352457",
    appId: "1:770226352457:web:43d01556df75e5e49cea98",
    measurementId: "G-2YRM1KMDDM"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const database = firebase.database();

// --- Elemen DOM ---
const uploadFormContainer = document.getElementById('upload-form-container');
const mediaFeed = document.getElementById('media-feed');
const loadingIndicator = document.getElementById('loading-indicator'); 
const modal = document.getElementById('media-modal');
const modalImage = document.getElementById('modal-image');
const closeBtn = document.getElementsByClassName('close-btn')[0];
const commentsList = document.getElementById('comments-list');
const commentForm = document.getElementById('comment-form');
const commentInput = document.getElementById('comment-input');
const nicknameInput = document.getElementById('nickname-input');
const setNicknameBtn = document.getElementById('set-nickname-btn');
const sessionIdDisplay = document.getElementById('session-id-display');

// Header Wallpaper Elements (NEW/UPDATED)
const wallpaperSettingForm = document.getElementById('wallpaper-setting-form');
const wallpaperLinkInput = document.getElementById('wallpaper-link');
const setWallpaperBtn = document.getElementById('set-wallpaper-btn');
const headerWallpaperImage = document.getElementById('header-wallpaper');
const focusControlPanel = document.getElementById('focus-control-panel');
const currentFocusDisplay = document.getElementById('current-focus-display');
const focusUpBtn = document.getElementById('focus-up');
const focusDownBtn = document.getElementById('focus-down');
const focusLeftBtn = document.getElementById('focus-left');
const focusRightBtn = document.getElementById('focus-right');
const focusResetBtn = document.getElementById('focus-reset');

// --- Logika Pemeriksaan Kunci Admin ---
const urlParams = new URLSearchParams(window.location.search);
const accessKey = urlParams.get('key');
const ADMIN_KEY = 'admin-eri-2025';
const IS_ADMIN = accessKey === ADMIN_KEY; 


// --- Variabel Global Status ---
let currentModalPostId = null; 
let currentFocusX = 50; 
let currentFocusY = 50; 
const FOCUS_STEP = 5; 

// Lazy Loading Variables
const POSTS_PER_PAGE = 9;
let lastPostKey = null; 
let isLoading = false;
let allPostsLoaded = false;

// --- Otentikasi dan Pengelolaan Sesi Pengguna ---
// ... (Logika Otentikasi dan Sesi) ...
auth.signInAnonymously()
    .then(() => {
        console.log("Login Anonim Berhasil. UID:", auth.currentUser.uid);
    })
    .catch(error => {
        console.error("PERINGATAN KRITIS: Gagal login Anonim Firebase. Cek Aturan Auth.", error);
    });

let currentUserId = sessionStorage.getItem('userId');
let currentNickname = sessionStorage.getItem('nickname');

if (!currentUserId || IS_ADMIN) {
    currentUserId = IS_ADMIN ? 'admin_eri_' + (auth.currentUser ? auth.currentUser.uid.substring(0, 8) : Date.now().toString()) : Date.now().toString();
    currentNickname = IS_ADMIN ? 'Administrator' : 'Anonim ' + Math.floor(Math.random() * 1000);
    
    sessionStorage.setItem('userId', currentUserId);
    sessionStorage.setItem('nickname', currentNickname);
}


// --- Fungsi Utilitas ---
function formatTimestamp(timestamp) {
    if (!timestamp) return 'Tanggal tidak diketahui';
    const date = new Date(timestamp);
    const options = {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false 
    };
    return date.toLocaleString('id-ID', options);
}


// --- 1. Admin UI, Post Submission, dan Header Wallpaper ---
if (IS_ADMIN) {
    uploadFormContainer.style.display = 'block';
} else {
    uploadFormContainer.style.display = 'none';
}

// 1.1 Logika Form Upload Media Feed (Tetap Sama)
document.getElementById('media-form').addEventListener('submit', function(e) {
    e.preventDefault();

    if (!IS_ADMIN) return;

    // ... (Logika upload post media) ...
    const caption = document.getElementById('caption').value;
    const thumbnailUrl = document.getElementById('thumbnail-url').value;
    const originalUrl = document.getElementById('original-url').value;
    const submitBtn = document.getElementById('submit-btn');

    if (!thumbnailUrl || !originalUrl) {
        alert("Link Thumbnail dan Link Media Asli wajib diisi.");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';

    const postData = {
        anonymousUserId: currentUserId,
        anonymousNickname: currentNickname, 
        caption: caption,
        thumbnailUrl: thumbnailUrl,
        originalMediaUrl: originalUrl,
        timestamp: firebase.database.ServerValue.TIMESTAMP 
    };

    database.ref('posts').push(postData)
        .then(() => {
            alert('Media berhasil diunggah! Memuat Feed Baru...');
            document.getElementById('media-form').reset(); 
            
            mediaFeed.innerHTML = '<h2>Feed Terbaru 🔥</h2>';
            lastPostKey = null;
            allPostsLoaded = false;
            loadPosts(); 
        })
        .catch(error => {
            console.error("Gagal menyimpan data:", error);
            alert('Gagal mengunggah media.');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Kirim Anonim';
        });
});

// 1.2 Logika Pengaturan Header Wallpaper (NEW)
wallpaperSettingForm.addEventListener('submit', function(e) {
    e.preventDefault();
    if (!IS_ADMIN) return;

    const link = wallpaperLinkInput.value.trim();
    if (!link) return alert("Link wallpaper tidak boleh kosong.");

    const btn = setWallpaperBtn;
    btn.disabled = true;
    btn.textContent = 'Menyimpan...';

    const wallpaperData = {
        url: link,
        focusPosition: '50% 50%', // Reset fokus saat ganti gambar
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    database.ref('config/headerWallpaper').set(wallpaperData)
        .then(() => {
            alert('Header Wallpaper berhasil diganti dan fokus direset!');
            loadHeaderWallpaper();
        })
        .catch(error => {
            console.error("Gagal menyimpan link wallpaper:", error);
            alert('Gagal mengganti wallpaper.');
        })
        .finally(() => {
            btn.disabled = false;
            btn.textContent = 'Ganti Dinding';
        });
});


// 1.3 Logika Pemuatan Header Wallpaper (UPDATED)
const headerConfigRef = database.ref('config/headerWallpaper');

function applyFocus(positionString) {
    headerWallpaperImage.style.objectPosition = positionString;
    currentFocusDisplay.textContent = positionString;
    
    const parts = positionString.split(' ');
    currentFocusX = parseInt(parts[0]);
    currentFocusY = parseInt(parts[1]);
}

function saveFocusToDB() {
    const newFocus = `${currentFocusX}% ${currentFocusY}%`;
    headerConfigRef.update({ focusPosition: newFocus })
        .then(() => console.log('Fokus header disimpan:', newFocus))
        .catch(error => console.error('Gagal menyimpan fokus header:', error));
}


function loadHeaderWallpaper() {
    headerConfigRef.once('value', (snapshot) => {
        const config = snapshot.val();

        if (config && config.url) {
            headerWallpaperImage.src = config.url;
            wallpaperLinkInput.value = config.url;
            const focusPosition = config.focusPosition || '50% 50%';
            
            // Terapkan fokus
            applyFocus(focusPosition);

        } else {
            console.log("Tidak ada konfigurasi header wallpaper. Menggunakan placeholder.");
            headerWallpaperImage.src = 'https://via.placeholder.com/1200x300/1a202c/ffffff?text=Galeri+Media+Anonim';
            wallpaperLinkInput.value = '';
            applyFocus('center center');
        }
    });
}

// Inisialisasi Header Wallpaper
document.addEventListener('DOMContentLoaded', loadHeaderWallpaper);


// 1.4 Logika Event Listener Kontrol Fokus Admin
if (IS_ADMIN) {
    const updateFocus = (axis, direction) => {
        const currentLink = wallpaperLinkInput.value.trim();
        if (!currentLink) return alert("Atur link wallpaper dulu sebelum mengatur fokus.");
        
        if (axis === 'x') {
            currentFocusX = Math.min(100, Math.max(0, currentFocusX + direction * FOCUS_STEP));
        } else if (axis === 'y') {
            currentFocusY = Math.min(100, Math.max(0, currentFocusY + direction * FOCUS_STEP));
        }
        
        const newFocus = `${currentFocusX}% ${currentFocusY}%`;
        applyFocus(newFocus);
        saveFocusToDB();
    };

    focusUpBtn.addEventListener('click', () => updateFocus('y', -1));
    focusDownBtn.addEventListener('click', () => updateFocus('y', 1));
    focusLeftBtn.addEventListener('click', () => updateFocus('x', -1));
    focusRightBtn.addEventListener('click', () => updateFocus('x', 1));
    
    focusResetBtn.addEventListener('click', () => {
        const currentLink = wallpaperLinkInput.value.trim();
        if (!currentLink) return alert("Atur link wallpaper dulu sebelum mereset fokus.");
        applyFocus('50% 50%');
        saveFocusToDB();
    });
}


// --- 2. Lazy Loading dan Post Display (Feed Media) ---
function createPostElement(postId, data) {
    const postDiv = document.createElement('div');
    postDiv.className = 'media-post';
    postDiv.setAttribute('data-id', postId);

    const formattedTime = formatTimestamp(data.timestamp); 

    postDiv.innerHTML = `
        <div class="post-header">
            <p>
                <strong>${data.anonymousNickname || 'Anonim User'}</strong> 
                <span style="float: right;">${formattedTime}</span>
            </p>
        </div>
        <div class="media-container">
            <img src="${data.thumbnailUrl}" alt="Media Thumbnail" 
                 data-original-url="${data.originalMediaUrl}" 
                 data-post-id="${postId}"
                 onclick="openModal(this)">
        </div>
        ${data.caption ? `<div class="post-caption">${data.caption}</div>` : ''}
    `;

    return postDiv;
}

function loadPosts() {
    if (isLoading || allPostsLoaded) return;

    isLoading = true;
    loadingIndicator.style.display = 'block';
    loadingIndicator.querySelector('p').textContent = "Memuat lebih banyak media...";

    let postsRef = database.ref('posts').orderByKey();
    
    if (lastPostKey) {
        postsRef = postsRef.endBefore(lastPostKey).limitToLast(POSTS_PER_PAGE);
    } else {
        postsRef = postsRef.limitToLast(POSTS_PER_PAGE);
    }

    postsRef.once('value', (snapshot) => {
        const posts = [];
        
        snapshot.forEach((childSnapshot) => {
            posts.push({ id: childSnapshot.key, data: childSnapshot.val() });
        });

        isLoading = false;
        loadingIndicator.style.display = 'none';

        if (posts.length === 0) {
             allPostsLoaded = true;
             loadingIndicator.querySelector('p').textContent = "Semua media telah dimuat.";
             loadingIndicator.style.display = 'block';
             return;
        }

        const currentOldestKey = posts[0].id;
        posts.reverse(); 

        posts.forEach(post => {
            if (post.data.thumbnailUrl && post.data.originalMediaUrl) {
                const postElement = createPostElement(post.id, post.data);
                mediaFeed.appendChild(postElement); 
            }
        });
        
        lastPostKey = currentOldestKey;

        if (posts.length < POSTS_PER_PAGE) {
            allPostsLoaded = true;
            loadingIndicator.querySelector('p').textContent = "Semua media telah dimuat.";
            loadingIndicator.style.display = 'block';
        }

    }, (errorObject) => {
        console.log('Pembacaan gagal: ' + errorObject.code);
        isLoading = false;
        loadingIndicator.style.display = 'none';
    });
}

// Panggil fungsi pemuatan post pertama kali
loadPosts();


// --- Scroll Listener untuk Memuat Otomatis ---
window.addEventListener('scroll', () => {
    const scrollThreshold = document.body.offsetHeight * 0.8;
    if ((window.innerHeight + window.scrollY) >= scrollThreshold ) {
        if (!isLoading && !allPostsLoaded) {
            loadPosts();
        }
    }
});


// --- 3. Logika Modal dan Komentar ---

// ... (Logika Modal dan Komentar tetap sama) ...

// Fungsi untuk menghapus komentar (Soft Delete oleh Admin)
window.deleteComment = function(postId, commentId) {
    if (!IS_ADMIN) {
        alert("Akses ditolak. Hanya Admin yang dapat menghapus komentar.");
        return;
    }
    if (confirm("Apakah Anda yakin ingin menghapus komentar ini? Komentar akan ditandai sebagai dihapus.")) {
        database.ref(`comments/${postId}/${commentId}`).update({
            isDeleted: true,
            text: "Pesan ini dihapus oleh Admin", 
            deletedTimestamp: firebase.database.ServerValue.TIMESTAMP 
        })
        .then(() => console.log("Komentar berhasil ditandai sebagai dihapus oleh Admin"))
        .catch(error => console.error("Gagal menandai komentar sebagai dihapus:", error));
    }
}

// Fungsi untuk memuat komentar (Menggunakan 'value' listener)
function loadComments(postId) {
    database.ref('comments/' + postId).off(); 
    commentsList.innerHTML = ''; 

    database.ref('comments/' + postId).on('value', (snapshot) => {
        commentsList.innerHTML = ''; 
        
        snapshot.forEach((childSnapshot) => {
            const commentId = childSnapshot.key;
            const commentData = childSnapshot.val();
            
            let contentHTML = '';
            let finalNicknameStyle = '';
            let finalIDDisplay = '';
            let deleteBtnHTML = '';

            if (commentData.isDeleted) {
                finalNicknameStyle = 'color: #ff4d4d; font-style: italic;'; 
                contentHTML = `<p style="margin: 5px 0 0 0; color: #ff4d4d; font-weight: bold;">${commentData.text}</p>`;
                finalIDDisplay = '';
            } else {
                const isCommentByAdmin = commentData.userId && commentData.userId.startsWith('admin_eri_');
                finalNicknameStyle = isCommentByAdmin ? 'color: var(--admin-color); font-weight: bold;' : ''; 
                contentHTML = `<p style="margin: 5px 0 0 0;">${commentData.text}</p>`;
                finalIDDisplay = commentData.userId ? commentData.userId.substring(0, 8) : 'N/A';
                
                deleteBtnHTML = IS_ADMIN ? 
                    `<button onclick="deleteComment('${postId}', '${commentId}')" 
                             style="background: #e53e3e; color: white; border: none; padding: 3px 8px; font-size: 0.75em; border-radius: 3px; cursor: pointer; float: right;">Hapus</button>` 
                    : '';
            }

            const commentItem = document.createElement('div');
            commentItem.className = 'comment-item';
            commentItem.innerHTML = `
                <p style="margin: 0; line-height: 1.2;">
                    <strong style="${finalNicknameStyle}">${commentData.isDeleted ? '' : (commentData.nickname || 'Anonim User')}</strong> 
                    <span style="font-size: 0.7em; color: #a0aec0; margin-left: 5px;">${commentData.isDeleted ? '' : `ID: ${finalIDDisplay}`}</span>
                    ${deleteBtnHTML}
                </p>
                ${contentHTML}
            `;
            commentsList.appendChild(commentItem);
        });

        commentsList.scrollTop = commentsList.scrollHeight; 
    });
}

// Logika Buka Modal
window.openModal = function(imgElement) {
    currentModalPostId = imgElement.getAttribute('data-post-id'); 
    const originalUrl = imgElement.getAttribute('data-original-url');
    modal.style.display = "block";
    modalImage.src = originalUrl;
    
    // Setup UI Modal
    if (!IS_ADMIN) {
        nicknameInput.value = sessionStorage.getItem('nickname');
        if(sessionIdDisplay) {
            sessionIdDisplay.textContent = sessionStorage.getItem('userId').substring(0, 8).toUpperCase();
        }
    } else {
        if(setNicknameBtn) setNicknameBtn.style.display = 'none';
        if(nicknameInput) nicknameInput.style.display = 'none';
        if(sessionIdDisplay) sessionIdDisplay.textContent = 'ADMIN';
    }

    loadComments(currentModalPostId);
}

// Menangani perubahan nickname dari user biasa
if (!IS_ADMIN && setNicknameBtn) {
    setNicknameBtn.addEventListener('click', function() {
        const newNickname = nicknameInput.value.trim();
        if (newNickname) {
            sessionStorage.setItem('nickname', newNickname);
            currentNickname = newNickname;
            alert(`Nama diubah menjadi: ${newNickname}. Komentar Anda selanjutnya akan menggunakan nama ini.`);
        } else {
            alert("Nama tidak boleh kosong!");
        }
    });
}


// Mengirim Komentar
commentForm.addEventListener('submit', function(e) {
    e.preventDefault();

    if (!currentModalPostId) return; 

    const commentText = commentInput.value.trim();
    if (commentText === '') return;

    let finalNickname = currentNickname;
    if (!IS_ADMIN) {
        finalNickname = nicknameInput.value.trim() || currentNickname;
        sessionStorage.setItem('nickname', finalNickname); 
        currentNickname = finalNickname;
    }
    
    const commentData = {
        userId: currentUserId, 
        nickname: finalNickname,
        text: commentText,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    database.ref('comments/' + currentModalPostId).push(commentData)
        .then(() => {
            commentInput.value = ''; 
        })
        .catch(error => {
            console.error("Gagal mengirim komentar:", error);
            alert("Gagal mengirim komentar. (Cek Aturan Keamanan Database Anda!)");
        });
});


// Tutup modal ketika tombol 'x' diklik
closeBtn.onclick = function() {
    modal.style.display = "none";
    modalImage.src = ''; 
    commentsList.innerHTML = '';
    database.ref('comments/' + currentModalPostId).off(); 
    currentModalPostId = null; 
}

// Tutup modal ketika pengguna mengklik di luar wrapper konten modal
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
        modalImage.src = ''; 
        commentsList.innerHTML = '';
        database.ref('comments/' + currentModalPostId).off();
        currentModalPostId = null;
    }
}