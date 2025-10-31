// firebase.js (VERSI FINAL: Logika Halaman Khusus Dihapus & Penempatan Post Diperbaiki)

// --- Konfigurasi dan Setup Firebase (Ganti dengan detail Anda!) ---
const firebaseConfig = {
    apiKey: "AIzaSyBwNQs-hKELUfhmSIod4q7nXfbBvzu55kI",
    authDomain: "sakura-bebcc.firebaseapp.com",
    databaseURL: "https://sakura-bebcc-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "sakura-bebcc",
    storageBucket: "sakura-bebcc.firebasestorage.app",
    messagingSenderId: "1070736938969",
    appId: "1:1070736938969:web:2b4bae1261637474d76bc8",
    measurementId: "G-2EWNCZ0MYY"
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

// Input Nickname Admin
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

// Elemen Pagination
const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');
const pageNumbersDisplay = document.getElementById('page-numbers-display');

// --- Logika Pemeriksaan Kunci Admin ---
const urlParams = new URLSearchParams(window.location.search);
const accessKey = urlParams.get('key');
const ADMIN_KEY = 'admin-eri-2025';
const IS_ADMIN = accessKey === ADMIN_KEY; 
const initialPostId = urlParams.get('postid'); 


// --- Variabel Global Status ---
let currentModalPostId = null; 
let currentFocusX = 50; 
let currentFocusY = 50; 
const FOCUS_STEP = 5; 

// Pagination Variables
const POSTS_PER_PAGE = 12; 
let currentPage = 1;
let totalPosts = 0;
let totalPages = 1;
let postKeys = []; 
let isLoading = false; 


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


function initializeUserSession() {
    // 1. Inisialisasi ID jika belum ada
    if (!currentUserId) {
        currentUserId = Date.now().toString();
        currentNickname = "Anonim User";
        
        sessionStorage.setItem('userId', currentUserId);
        sessionStorage.setItem('nickname', currentNickname);
    }
    
    // 2. Override jika Admin
    if (IS_ADMIN) {
        currentUserId = 'admin_eri_' + (auth.currentUser.uid.substring(0, 8));
        currentNickname = sessionStorage.getItem('adminNickname') || 'Administrator'; 
        
        sessionStorage.setItem('userId', currentUserId); 
        sessionStorage.setItem('nickname', currentNickname); 
        sessionStorage.setItem('adminNickname', currentNickname); 
    } else {
        currentNickname = sessionStorage.getItem('nickname');
    }

    // 3. Tampilkan User ID Sesi di modal
    if (sessionIdDisplay) {
        sessionIdDisplay.textContent = IS_ADMIN ? 'ADMIN' : currentUserId.substring(0, 8).toUpperCase();
    }
}

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
    adminNicknameInput.value = currentNickname; 
} else {
    uploadFormContainer.style.display = 'none';
}


document.getElementById('media-form').addEventListener('submit', function(e) {
    e.preventDefault();

    if (!IS_ADMIN) return;
    
    const adminNickname = adminNicknameInput.value.trim();
    const caption = document.getElementById('caption').value;
    const thumbnailUrl = document.getElementById('thumbnail-url').value;
    const originalUrl = document.getElementById('original-url').value;
    const submitBtn = document.getElementById('submit-btn');

    if (!adminNickname || !thumbnailUrl || !originalUrl) {
        alert("Nama, Link Thumbnail, dan Link Media Asli wajib diisi.");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';
    
    sessionStorage.setItem('adminNickname', adminNickname);

    const postData = {
        anonymousUserId: currentUserId,
        anonymousNickname: adminNickname,
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
            
            // Kembali ke halaman 1 dan muat ulang
            currentPage = 1;
            initializePagination(); 
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
    currentFocusX = parseInt(parts[0].replace('%', ''));
    currentFocusY = parseInt(parts[1].replace('%', ''));
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


if (IS_ADMIN) {
    focusControlPanel.style.display = 'block';
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
} else {
    if(focusControlPanel) focusControlPanel.style.display = 'none';
}


// --- 3. Pagination, Post Display, dan Comment Count ---

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

function initializePagination() {
    isLoading = true;
    loadingIndicator.style.display = 'block';
    loadingIndicator.querySelector('p').textContent = "Menginisialisasi Pagination...";

    // Hapus semua elemen post yang ada
    const postElements = mediaFeed.querySelectorAll('.media-post');
    postElements.forEach(el => mediaFeed.removeChild(el));


    database.ref('posts').orderByKey().once('value', (snapshot) => {
        postKeys = [];
        snapshot.forEach((childSnapshot) => {
            postKeys.push(childSnapshot.key);
        });

        postKeys.reverse(); 
        totalPosts = postKeys.length;
        totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);

        if (initialPostId) {
            const postIndex = postKeys.findIndex(key => key === initialPostId);
            if (postIndex !== -1) {
                currentPage = Math.floor(postIndex / POSTS_PER_PAGE) + 1;
            }
        }
        
        if (currentPage < 1) currentPage = 1;
        if (currentPage > totalPages) currentPage = totalPages;

        isLoading = false; 
        updatePaginationUI();
        fetchPostsForPage(currentPage);
    }, (errorObject) => {
        console.error('Inisialisasi Pagination gagal: ' + errorObject.code);
        isLoading = false;
        loadingIndicator.style.display = 'none';
        mediaFeed.innerHTML += '<p style="grid-column: 1 / -1; text-align: center;">Gagal memuat daftar post.</p>';
    });
}

async function fetchPostsForPage(page) {
    if (isLoading || totalPosts === 0) return;

    isLoading = true;
    
    // HAPUS SEMUA POST LAMA SEBELUM MEMUAT YANG BARU
    const postElements = mediaFeed.querySelectorAll('.media-post');
    postElements.forEach(el => mediaFeed.removeChild(el));

    loadingIndicator.style.display = 'block';
    loadingIndicator.querySelector('p').textContent = `Memuat halaman ${page} dari ${totalPages}...`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    currentPage = page; 
    
    const startIndex = (page - 1) * POSTS_PER_PAGE;
    const endIndex = Math.min(startIndex + POSTS_PER_PAGE, totalPosts);
    const keysForPage = postKeys.slice(startIndex, endIndex);

    if (keysForPage.length === 0) {
        isLoading = false;
        loadingIndicator.style.display = 'none';
        
        const feedHeaderControlsWrapper = mediaFeed.querySelector('.feed-header-controls');
        // Tambahkan pesan "Tidak ada media" setelah wrapper kontrol
        if (feedHeaderControlsWrapper) {
            const noMediaMsg = document.createElement('p');
            noMediaMsg.style.cssText = 'grid-column: 1 / -1; text-align: center; color: #a0aec0;';
            noMediaMsg.textContent = 'Tidak ada media di halaman ini.';
            mediaFeed.insertBefore(noMediaMsg, feedHeaderControlsWrapper.nextSibling); 
        }
        updatePaginationUI();
        return;
    }

    try {
        const postPromises = keysForPage.map(key => 
            database.ref('posts/' + key).once('value').then(snapshot => ({ id: key, data: snapshot.val() }))
        );
        
        let postsData = await Promise.all(postPromises);
        
        postsData = postsData
            .filter(post => post.data && post.data.thumbnailUrl && post.data.originalMediaUrl)
            .sort((a, b) => postKeys.indexOf(a.id) - postKeys.indexOf(b.id)); 
        
        // PENTING: Cari wrapper untuk penyisipan
        const feedHeaderControlsWrapper = mediaFeed.querySelector('.feed-header-controls');
        let insertionPoint = feedHeaderControlsWrapper ? feedHeaderControlsWrapper.nextSibling : null;

        postsData.forEach(post => {
            const postElement = createPostElement(post.id, post.data);
            
            // Sisipkan post setelah wrapper header/kontrol
            if (insertionPoint) {
                 mediaFeed.insertBefore(postElement, insertionPoint);
            } else {
                 mediaFeed.appendChild(postElement); 
            }
        });

        if (initialPostId && keysForPage.includes(initialPostId)) {
            const imgElement = mediaFeed.querySelector(`.media-post[data-id="${initialPostId}"] img`);
            if(imgElement) {
                openModal(imgElement);
                urlParams.delete('postid'); 
                history.replaceState(null, '', 'index.html' + (IS_ADMIN ? `?key=${ADMIN_KEY}` : '')); 
            }
        }

    } catch (error) {
        console.error("Gagal mengambil post untuk halaman:", error);
        mediaFeed.innerHTML += '<p style="grid-column: 1 / -1; text-align: center;">Terjadi kesalahan saat memuat media.</p>';
    } finally {
        isLoading = false;
        loadingIndicator.style.display = 'none';
        updatePaginationUI();
    }
}


function updatePaginationUI() {
    pageNumbersDisplay.textContent = `Halaman ${currentPage} dari ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages || totalPosts === 0;
    
    if (totalPosts === 0) {
        pageNumbersDisplay.textContent = "Belum ada media yang diunggah.";
    }
}

// Listener untuk Tombol Pagination
prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        fetchPostsForPage(currentPage);
    }
});

nextPageBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        fetchPostsForPage(currentPage);
    }
});

document.addEventListener('DOMContentLoaded', initializePagination);


// --- FUNGSI DELETE POST ---
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
                
                initializePagination(); 
            })
            .catch(error => {
                console.error("Gagal menghapus postingan:", error);
                alert("Gagal menghapus postingan.");
            });
    }
}

// --- FUNGSI KOMENTAR & MODAL ---

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
            if (currentModalPostId === postId) {
                loadComments(postId); 
            }
        })
        .catch(error => console.error("Gagal menandai komentar sebagai dihapus:", error));
    }
}

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

window.openModal = function(imgElement) {
    currentModalPostId = imgElement.getAttribute('data-post-id'); 
    const originalUrl = imgElement.getAttribute('data-original-url');
    modal.style.display = "block";
    modalImage.src = originalUrl;
    
    if (!IS_ADMIN) {
        nicknameInput.value = currentNickname; 
    } else {
        if(setNicknameBtn) setNicknameBtn.style.display = 'none';
        if(nicknameInput) nicknameInput.style.display = 'none';
        if(sessionIdDisplay) sessionIdDisplay.textContent = 'ADMIN';
    }

    loadComments(currentModalPostId);
}

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
    } else {
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


closeBtn.onclick = function() {
    modal.style.display = "none";
    modalImage.src = ''; 
    commentsList.innerHTML = '';
    database.ref('comments/' + currentModalPostId).off(); 
    currentModalPostId = null; 
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
        modalImage.src = ''; 
        commentsList.innerHTML = '';
        database.ref('comments/' + currentModalPostId).off();
        currentModalPostId = null;
    }
}