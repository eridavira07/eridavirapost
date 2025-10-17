// firebase.js (VERSI TERBARU: DELETE POST, COMMENT COUNT, ADMIN MANUAL NICKNAME)

// --- Konfigurasi dan Setup Firebase (Ganti dengan detail Anda!) ---
const firebaseConfig = {
    apiKey: "AIzaSyC6eQQ5KmfNeE-MbbGztfgvUr-Q388K", // GANTI INI
    authDomain: "anon-chat-eri.firebaseapp.com", // GANTI INI
    databaseURL: "https://anon-chat-eri-default-rtdb.asia-southeast1.firebasedatabase.app", // GANTI INI
    projectId: "anon-chat-eri", // GANTI INI
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

// NEW: Input Nickname Admin
const adminNicknameInput = document.getElementById('admin-nickname-input');

// Header Wallpaper Elements
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

auth.signInAnonymously()
    .then(() => {
        console.log("Login Anonim Berhasil. UID:", auth.currentUser.uid);
    })
    .catch(error => {
        console.error("PERINGATAN KRITIS: Gagal login Anonim Firebase. Cek Aturan Auth.", error);
    });

let currentUserId = sessionStorage.getItem('userId');
let currentNickname = sessionStorage.getItem('nickname');


// Logika Inisialisasi User Sederhana (Tidak ada nickname acak)
function initializeUserSession() {
    // 1. Inisialisasi ID jika belum ada
    if (!currentUserId) {
        currentUserId = Date.now().toString();
        // Fallback nickname default
        currentNickname = "Anonim User";
        
        sessionStorage.setItem('userId', currentUserId);
        sessionStorage.setItem('nickname', currentNickname);
    }
    
    // 2. Override jika Admin
    if (IS_ADMIN) {
        currentUserId = 'admin_eri_' + (auth.currentUser.uid.substring(0, 8));
        currentNickname = sessionStorage.getItem('adminNickname') || 'Administrator'; // Coba ambil dari session atau default
        
        sessionStorage.setItem('userId', currentUserId); 
        sessionStorage.setItem('nickname', currentNickname); 
        sessionStorage.setItem('adminNickname', currentNickname); // Simpan default admin nickname
    } else {
        // Update global variable jika bukan Admin
        currentNickname = sessionStorage.getItem('nickname');
    }

    // 3. Tampilkan User ID Sesi di modal
    if (sessionIdDisplay) {
        sessionIdDisplay.textContent = IS_ADMIN ? 'ADMIN' : currentUserId.substring(0, 8).toUpperCase();
    }
}

// Panggil fungsi inisialisasi
document.addEventListener('DOMContentLoaded', initializeUserSession);


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
    
    // Pre-fill admin nickname input
    // Menggunakan currentNickname yang sudah diinisialisasi
    adminNicknameInput.value = currentNickname; 
} else {
    uploadFormContainer.style.display = 'none';
}


// 1.1 Logika Form Upload Media Feed (UPDATED)
document.getElementById('media-form').addEventListener('submit', function(e) {
    e.preventDefault();

    if (!IS_ADMIN) return;

    const adminNickname = adminNicknameInput.value.trim();
    const caption = document.getElementById('caption').value;
    const thumbnailUrl = document.getElementById('thumbnail-url').value;
    const originalUrl = document.getElementById('original-url').value;
    const submitBtn = document.getElementById('submit-btn');

    if (!adminNickname) {
        alert("Nama yang akan ditampilkan (Nickname) wajib diisi oleh Admin.");
        return;
    }

    if (!thumbnailUrl || !originalUrl) {
        alert("Link Thumbnail dan Link Media Asli wajib diisi.");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';
    
    // Simpan nickname yang baru diinput admin ke session untuk post berikutnya
    sessionStorage.setItem('adminNickname', adminNickname);

    const postData = {
        anonymousUserId: currentUserId,
        anonymousNickname: adminNickname, // Menggunakan input Admin
        caption: caption,
        thumbnailUrl: thumbnailUrl,
        originalMediaUrl: originalUrl,
        timestamp: firebase.database.ServerValue.TIMESTAMP 
    };

    database.ref('posts').push(postData)
        .then(() => {
            alert('Media berhasil diunggah! Memuat Feed Baru...');
            
            document.getElementById('caption').value = ''; 
            document.getElementById('thumbnail-url').value = '';
            document.getElementById('original-url').value = '';
            
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

// 1.2 Logika Pengaturan Header Wallpaper
const headerConfigRef = database.ref('config/headerWallpaper');

wallpaperSettingForm.addEventListener('submit', function(e) {
    e.preventDefault();
    if (!IS_ADMIN) return;

    const link = wallpaperLinkInput.value.trim();
    if (!link) return alert("Link wallpaper tidak boleh kosong.");

    const btn = setWallpaperBtn;
    btn.disabled = true;
    btn.textContent = 'Menyimpan...';

    let existingFocus = `${currentFocusX}% ${currentFocusY}%`;

    headerConfigRef.once('value').then(snapshot => {
        const config = snapshot.val();
        if (config && config.focusPosition) {
            existingFocus = config.focusPosition;
        }

        const wallpaperData = {
            url: link,
            focusPosition: existingFocus, 
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
    
        return headerConfigRef.set(wallpaperData);
    })
    .then(() => {
        alert('Header Wallpaper berhasil diganti!');
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
            
            applyFocus(focusPosition);

        } else {
            console.log("Tidak ada konfigurasi header wallpaper. Menggunakan placeholder.");
            headerWallpaperImage.src = 'https://via.placeholder.com/1200x300/1a202c/ffffff?text=Galeri+Media+Anonim';
            wallpaperLinkInput.value = '';
            applyFocus('center center');
        }
    });
}

document.addEventListener('DOMContentLoaded', loadHeaderWallpaper);


// 1.3 Logika Event Listener Kontrol Fokus Admin
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


// --- 2. Admin Nickname Management (Dihapus) ---


// --- 3. Lazy Loading, Post Display, dan Comment Count ---

// Fungsi untuk Ambil jumlah komentar untuk Post ID tertentu
function fetchCommentCount(postId, element) {
    database.ref('comments/' + postId).once('value', (snapshot) => {
        const totalComments = snapshot.numChildren();
        
        const commentCountElement = element.querySelector('.comment-count-display');
        if (commentCountElement) {
            commentCountElement.textContent = `${totalComments} Komentar`;
        }
    }).catch(error => {
        console.error("Gagal mengambil hitungan komentar:", error);
    });
}


function createPostElement(postId, data) {
    const postDiv = document.createElement('div');
    postDiv.className = 'media-post';
    postDiv.setAttribute('data-id', postId);

    const formattedTime = formatTimestamp(data.timestamp); 
    
    // Tombol Hapus Post (Hanya untuk Admin)
    const deleteButtonHTML = IS_ADMIN ? 
        `<button onclick="deletePost('${postId}')" 
                 style="background: var(--deleted-color); color: white; border: none; padding: 4px 8px; font-size: 0.8em; border-radius: 4px; cursor: pointer; float: right; margin-left: 10px;">
                 Hapus Post
         </button>` 
        : '';


    postDiv.innerHTML = `
        <div class="post-header">
            <p style="margin-bottom: 5px;">
                <strong>${data.anonymousNickname || 'Anonim User'}</strong> 
                <span style="float: right;">${formattedTime}</span>
                ${deleteButtonHTML} </p>
            <p style="margin-top: 5px; font-size: 0.8em; color: var(--accent-color);">
                <span class="comment-count-display">Memuat...</span>
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
    
    fetchCommentCount(postId, postDiv);

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

        if (posts.length === 0 && lastPostKey) {
             allPostsLoaded = true;
             loadingIndicator.querySelector('p').textContent = "Semua media telah dimuat.";
             loadingIndicator.style.display = 'block';
             return;
        } else if (posts.length === 0 && !lastPostKey) {
             loadingIndicator.querySelector('p').textContent = "Belum ada media yang diunggah.";
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


// --- 4. Logika Modal dan Komentar ---

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
        .then(() => {
            console.log("Komentar berhasil ditandai sebagai dihapus oleh Admin");
            const postElement = document.querySelector(`.media-post[data-id="${postId}"]`);
            if(postElement) {
                 fetchCommentCount(postId, postElement);
            }
        })
        .catch(error => console.error("Gagal menandai komentar sebagai dihapus:", error));
    }
}

// Fungsi untuk menghapus Post (Media dan Komentar terkait) oleh Admin
window.deletePost = function(postId) {
    if (!IS_ADMIN) {
        alert("Akses ditolak. Hanya Admin yang dapat menghapus postingan.");
        return;
    }
    if (confirm("PERINGATAN! Apakah Anda yakin ingin menghapus postingan ini? Semua komentar terkait juga akan dihapus permanen.")) {
        
        database.ref(`posts/${postId}`).remove()
            .then(() => {
                return database.ref(`comments/${postId}`).remove();
            })
            .then(() => {
                alert("Postingan dan semua komentar terkait berhasil dihapus.");
                
                const postElement = document.querySelector(`.media-post[data-id="${postId}"]`);
                if (postElement) {
                    postElement.remove();
                }
                
                if (mediaFeed.children.length <= 1) { 
                     mediaFeed.innerHTML = '<h2>Feed Terbaru 🔥</h2>';
                     lastPostKey = null;
                     allPostsLoaded = false;
                     loadPosts(); 
                }
            })
            .catch(error => {
                console.error("Gagal menghapus postingan:", error);
                alert("Gagal menghapus postingan.");
            });
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
        nicknameInput.value = currentNickname; 
    } else {
        // Sembunyikan input nickname dan tombol set untuk Admin di modal
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
        // User biasa menggunakan nickname dari input modal (jika diubah)
        finalNickname = nicknameInput.value.trim() || currentNickname;
        sessionStorage.setItem('nickname', finalNickname); 
        currentNickname = finalNickname;
    } else {
        // Admin menggunakan nickname yang terakhir digunakan dari session
        finalNickname = sessionStorage.getItem('adminNickname') || 'Administrator';
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
            const postElement = document.querySelector(`.media-post[data-id="${currentModalPostId}"]`);
            if(postElement) {
                 fetchCommentCount(currentModalPostId, postElement);
            }
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