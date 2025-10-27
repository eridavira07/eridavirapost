// futa.js (VERSI FINAL: PERBAIKAN WARNA ADMIN COMMENT UNTUK NON-ADMIN)

// --- Konfigurasi dan Setup Firebase (Detail Baru Anda!) ---
const firebaseConfig = {
    apiKey: "AIzaSyCss7S8vI2m616yGnWn9l_37zEEy8kL9Uc",
    authDomain: "futan-5e4f1.firebaseapp.com",
    databaseURL: "https://futan-5e4f1-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "futan-5e4f1",
    storageBucket: "futan-5e4f1.appspot.com",
    messagingSenderId: "691910503131",
    appId: "1:691910503131:web:4eeb2f6a5a1e0084337afe",
    measurementId: "G-7WHWMYPQQ3"
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
const raritySelect = document.getElementById('rarity-select'); 

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
const jumpToPageInput = document.getElementById('jump-to-page-input'); 
const jumpToPageBtn = document.getElementById('jump-to-page-btn'); 

// ELEMEN SORTING
const sortSelect = document.getElementById('sort-select');

// ELEMEN FILTER KELANGKAAN 
const rarityCheckboxesContainer = document.getElementById('rarity-checkboxes');
const ALL_RARITIES = ['Silver', 'Gold', 'Epic', 'Legendary'];
let activeRarityFilters = [...ALL_RARITIES]; 

// ELEMEN SEARCH BARU
const searchInput = document.getElementById('search-input'); 
let currentSearchTerm = ''; 

// ELEMEN EDIT POST
const editPostModal = document.getElementById('edit-post-modal');
const closeEditBtn = document.getElementById('close-edit-btn');
const editPostForm = document.getElementById('edit-post-form');
const editPostIdInput = document.getElementById('edit-post-id');
const editNicknameInput = document.getElementById('edit-nickname');
const editCaptionInput = document.getElementById('edit-caption');
const editRaritySelect = document.getElementById('edit-rarity-select');
const saveEditBtn = document.getElementById('save-edit-btn');


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

// Pagination and Sorting Variables
const POSTS_PER_PAGE = 12; 
let currentPage = 1;
let totalPosts = 0;
let totalPages = 1;
let postKeys = []; 
let allPostsMinimalData = []; 
let currentSort = 'latest'; 
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
    document.body.className = IS_ADMIN ? 'admin-mode' : ''; 
    
    // 1. Logika Administrasi (IS_ADMIN = true)
    if (IS_ADMIN) {
        currentUserId = 'admin_eri_' + (auth.currentUser ? auth.currentUser.uid.substring(0, 8) : 'loading'); 
        currentNickname = sessionStorage.getItem('adminNickname') || 'Administrator'; 
        
        sessionStorage.setItem('userId', currentUserId); // Timpa ID anonim
        sessionStorage.setItem('nickname', currentNickname); 
        sessionStorage.setItem('adminNickname', currentNickname); 
        
    } 
    
    // 2. Logika Non-Admin (Perbaikan Bug: me-reset ID Admin yang tersimpan)
    // Jika BUKAN Admin DAN (ID belum ada ATAU ID yang tersimpan adalah Admin ID)
    else if (!currentUserId || currentUserId.startsWith('admin_eri_')) {
        
        // Force reset dan buat ID non-admin baru yang jelas
        currentUserId = 'anonim_user_' + Date.now().toString(); 
        // Pertahankan nickname yang mungkin sudah diatur user, jika tidak gunakan 'Anonim User'
        currentNickname = sessionStorage.getItem('nickname') || "Anonim User"; 
        
        sessionStorage.setItem('userId', currentUserId);
        sessionStorage.setItem('nickname', currentNickname);
        
        // Hapus sisa nickname admin
        if (sessionStorage.getItem('adminNickname')) {
             sessionStorage.removeItem('adminNickname');
        }
    } 
    // Kasus else: Non-Admin dan sudah memiliki ID Anonim yang valid. currentUserId dan currentNickname sudah benar.
    
    // Pastikan currentNickname global diperbarui jika tidak diatur ulang di atas (untuk kasus Non-Admin yang sudah memiliki ID anonim lama)
    if (!IS_ADMIN && !currentNickname) {
         currentNickname = sessionStorage.getItem('nickname');
    }

    if (sessionIdDisplay) {
        sessionIdDisplay.textContent = IS_ADMIN ? 'ADMIN' : currentUserId.substring(0, 8).toUpperCase();
    }

    setupRarityCheckboxes();
    initializePagination();
}

document.addEventListener('DOMContentLoaded', initializeUserSession);

// Event listener untuk tombol Set Nama di modal komentar
if (setNicknameBtn) {
    setNicknameBtn.addEventListener('click', () => {
        const newNickname = nicknameInput.value.trim();
        if (newNickname) {
            sessionStorage.setItem('nickname', newNickname);
            currentNickname = newNickname;
            alert(`Nama Anda berhasil diubah menjadi: ${newNickname}`);

            if (IS_ADMIN) {
                 sessionStorage.setItem('adminNickname', newNickname);
                 adminNicknameInput.value = newNickname;
            }
        } else {
            alert('Nama tidak boleh kosong.');
        }
    });
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
    const rarity = raritySelect.value; 
    const submitBtn = document.getElementById('submit-btn');

    if (!adminNickname || !thumbnailUrl || !originalUrl || !rarity) {
        alert("Nama, Link Thumbnail, Link Media Asli, dan Kelangkaan wajib diisi.");
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
        rarity: rarity, 
        timestamp: firebase.database.ServerValue.TIMESTAMP 
    };

    database.ref('posts').push(postData)
        .then(() => {
            alert('Media berhasil diunggah! Memuat Feed Baru...');
            
            document.getElementById('caption').value = ''; 
            document.getElementById('thumbnail-url').value = '';
            document.getElementById('original-url').value = '';
            raritySelect.value = 'Silver'; 
            
            mediaFeed.innerHTML = ''; 
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

// Logika Pengaturan Header Wallpaper
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


// --- 2. Pin Post Logic ---

window.pinPost = function(postId, isCurrentlyPinned) {
    if (!IS_ADMIN) {
        alert("Akses ditolak. Hanya Admin yang dapat mem-pin postingan.");
        return;
    }
    
    const newPinStatus = !isCurrentlyPinned;
    const action = newPinStatus ? "Pin" : "Lepas Pin";
    if (!confirm(`Apakah Anda yakin ingin ${action} postingan ini?`)) {
        return;
    }
    
    let updates = {};
    
    if (newPinStatus) {
        allPostsMinimalData.forEach(post => {
            if (post.data.isPinned) {
                updates[`posts/${post.id}/isPinned`] = null; 
                post.data.isPinned = false; 
            }
        });
        
        updates[`posts/${postId}/isPinned`] = true;
    } else {
        updates[`posts/${postId}/isPinned`] = null;
    }

    const targetRef = database.ref('/');
    targetRef.update(updates)
        .then(() => {
            alert(`Postingan berhasil di${newPinStatus ? 'pin' : 'lepas pin'}! Memuat ulang feed...`);
            const targetPost = allPostsMinimalData.find(post => post.id === postId);
            if (targetPost) {
                targetPost.data.isPinned = newPinStatus;
            }
            mediaFeed.innerHTML = ''; 
            currentPage = 1; 
            initializePagination();
        })
        .catch(error => {
            console.error(`Gagal ${action} postingan:`, error);
            alert(`Gagal ${action} postingan.`);
        });
}


// --- 3. Edit Post Logic ---

window.openEditModal = function(postId, currentNickname, currentCaption, currentRarity) {
    if (!IS_ADMIN) {
        alert("Akses ditolak. Hanya Admin yang dapat mengedit postingan.");
        return;
    }
    editPostIdInput.value = postId;
    editNicknameInput.value = currentNickname;
    editCaptionInput.value = currentCaption;
    if (editRaritySelect) {
        editRaritySelect.value = currentRarity;
    }
    editPostModal.style.display = 'block';
}

editPostForm.addEventListener('submit', function(e) {
    e.preventDefault();
    if (!IS_ADMIN) return;

    const postId = editPostIdInput.value;
    const newNickname = editNicknameInput.value.trim();
    const newCaption = editCaptionInput.value.trim();
    const newRarity = editRaritySelect.value;

    if (!newNickname) {
        alert("Nama tidak boleh kosong.");
        return;
    }

    saveEditBtn.disabled = true;
    saveEditBtn.textContent = 'Menyimpan...';

    const updates = {
        anonymousNickname: newNickname,
        caption: newCaption,
        rarity: newRarity
    };

    database.ref(`posts/${postId}`).update(updates)
        .then(() => {
            alert("Postingan berhasil diperbarui! Memuat ulang feed...");
            editPostModal.style.display = 'none';
            mediaFeed.innerHTML = ''; 
            currentPage = 1;
            initializePagination();
        })
        .catch(error => {
            console.error("Gagal menyimpan perubahan postingan:", error);
            alert("Gagal menyimpan perubahan postingan.");
        })
        .finally(() => {
            saveEditBtn.disabled = false;
            saveEditBtn.textContent = 'Simpan Perubahan';
        });
});

closeEditBtn.onclick = function() {
    editPostModal.style.display = 'none';
}

window.addEventListener('click', function(event) {
    if (event.target == editPostModal) {
        editPostModal.style.display = 'none';
    }
});

window.openAdminModal = function(postId) {
    const postElement = document.querySelector(`.media-post[data-id="${postId}"]`);
    if (postElement) {
        const imgElement = postElement.querySelector('.media-container img');
        if (imgElement) {
            openModal(imgElement);
        } else {
            console.error('Image element not found for post:', postId);
        }
    }
}


// --- 4. Post Display, Comment Count, dan Sorting Logic ---

function fetchCommentCount(postId) {
    return database.ref('comments/' + postId).once('value')
        .then(snapshot => {
            return snapshot.numChildren();
        }).catch(error => {
            console.error(`Gagal mengambil hitungan komentar untuk ${postId}:`, error);
            return 0;
        });
}

function updateCommentCountDisplay(postId, totalComments) {
    const postElement = document.querySelector(`.media-post[data-id="${postId}"]`);
    if (postElement) {
        const commentCountElement = postElement.querySelector('.comment-count-display');
        if (commentCountElement) {
            commentCountElement.textContent = `${totalComments} Komentar`;
        }
    }
}

function createPostElement(postId, data) {
    const rarity = data.rarity || 'Silver';

    const postDiv = document.createElement('div');
    postDiv.className = `media-post rarity-${rarity.toLowerCase()}`;
    if (data.isPinned) {
        postDiv.classList.add('pinned-post');
    }
    postDiv.setAttribute('data-id', postId);

    const commentCount = data.commentCount !== undefined ? data.commentCount : 'Memuat...';
    const formattedTime = formatTimestamp(data.timestamp);
    
    
    const deleteButtonHTML = IS_ADMIN ? 
        `<button onclick="deletePost('${postId}')" style="background: var(--deleted-color); color: white; border: none; padding: 4px 8px; font-size: 0.8em; border-radius: 4px; cursor: pointer; float: right; margin-left: 10px;"> Hapus Post </button>` : '';

    const isPinned = !!data.isPinned;
    const pinButtonText = isPinned ? 'Lepas Pin' : 'Pin Post';
    const pinButtonHTML = IS_ADMIN ?
        `<button onclick="pinPost('${postId}', ${isPinned})" style="background: ${isPinned ? 'var(--admin-color)' : '#4a5568'}; color: ${isPinned ? 'var(--bg-color)' : 'white'}; border: none; padding: 4px 8px; font-size: 0.8em; border-radius: 4px; cursor: pointer; float: right; margin-left: 10px;"> ${pinButtonText} </button>` : '';
        
    const editButtonHTML = IS_ADMIN ? 
        `<button onclick="openEditModal('${postId}', '${data.anonymousNickname.replace(/'/g, "\\'")}', '${(data.caption || '').replace(/'/g, "\\'")}', '${rarity}')" style="background: #4a5568; color: white; border: none; padding: 4px 8px; font-size: 0.8em; border-radius: 4px; cursor: pointer; float: right; margin-left: 10px;"> Edit Post </button>` : '';
        
    const openAdminButtonHTML = IS_ADMIN ?
        `<button onclick="openAdminModal('${postId}')" style="background: var(--accent-color); color: var(--bg-color); border: none; padding: 4px 8px; font-size: 0.8em; border-radius: 4px; cursor: pointer; float: right; margin-left: 10px;"> Buka Post </button>` : '';

    postDiv.innerHTML = `
        <div class="post-header">
            ${deleteButtonHTML}
            ${pinButtonHTML}
            ${editButtonHTML}
            ${openAdminButtonHTML}
            <span class="rarity-tag rarity-${rarity.toLowerCase()}">${rarity}</span>
            <strong style="color: ${isPinned ? 'var(--admin-color)' : 'var(--text-color)'}">${data.anonymousNickname}</strong>
            <p style="font-size: 0.75em; color: #a0aec0; margin: 2px 0 0 0;">${formattedTime}</p>
        </div>
        <div class="media-container" onclick="openModal(this.querySelector('img'))">
            <img src="${data.thumbnailUrl}" alt="${data.caption || 'Media Post'}" 
                data-original-url="${data.originalMediaUrl}" 
                data-id="${postId}">
        </div>
        <div class="post-caption">
            <p style="margin: 0;">${data.caption || 'Tidak ada keterangan.'}</p>
        </div>
        <div style="padding: 10px 15px; font-size: 0.85em; color: var(--accent-color);">
            <span class="comment-count-display">${commentCount} Komentar</span>
        </div>
    `;

    // Ambil hitungan komentar secara asinkron
    fetchCommentCount(postId).then(count => {
        data.commentCount = count; // Simpan di minimal data
        updateCommentCountDisplay(postId, count);
    });

    return postDiv;
}


window.deletePost = function(postId) {
    if (!IS_ADMIN) {
        alert("Akses ditolak. Hanya Admin yang dapat menghapus postingan.");
        return;
    }
    
    if (!confirm("Apakah Anda yakin ingin menghapus postingan ini PERMANEN?")) {
        return;
    }

    // 1. Hapus komentar terkait
    database.ref('comments/' + postId).remove()
        .then(() => {
            console.log(`Komentar post ${postId} berhasil dihapus.`);
            // 2. Hapus postingan itu sendiri
            return database.ref('posts/' + postId).remove();
        })
        .then(() => {
            alert("Postingan berhasil dihapus! Memuat ulang feed...");
            mediaFeed.innerHTML = ''; 
            currentPage = 1;
            initializePagination(); 
        })
        .catch(error => {
            console.error("Gagal menghapus postingan:", error);
            alert("Gagal menghapus postingan.");
        });
}


// --- 5. Filter/Sort/Search Logic ---

function setupRarityCheckboxes() {
    rarityCheckboxesContainer.innerHTML = ''; 
    
    ALL_RARITIES.forEach(rarity => {
        const rarityKey = rarity.toLowerCase();
        const label = document.createElement('label');
        label.style.fontSize = '0.9em';
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = 'rarity-filter';
        input.value = rarity;
        input.checked = true; 
        input.style.marginRight = '5px';

        label.appendChild(input);
        label.appendChild(document.createTextNode(rarity));
        rarityCheckboxesContainer.appendChild(label);

        input.addEventListener('change', handleFilterChange);
    });
}

function handleFilterChange() {
    const checkboxes = document.querySelectorAll('#rarity-checkboxes input[name="rarity-filter"]');
    activeRarityFilters = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    applyFiltersAndSort();
}

sortSelect.addEventListener('change', () => {
    currentSort = sortSelect.value;
    applyFiltersAndSort();
});

searchInput.addEventListener('input', () => {
    currentSearchTerm = searchInput.value.toLowerCase().trim();
    applyFiltersAndSort();
});

function applyFiltersAndSort() {
    if (allPostsMinimalData.length === 0) return;

    let filteredPosts = allPostsMinimalData.filter(post => {
        const passesRarity = activeRarityFilters.includes(post.data.rarity);
        if (!passesRarity) return false;

        if (currentSearchTerm) {
            const caption = (post.data.caption || '').toLowerCase();
            const nickname = (post.data.anonymousNickname || '').toLowerCase();
            if (!caption.includes(currentSearchTerm) && !nickname.includes(currentSearchTerm)) {
                return false;
            }
        }
        return true;
    });

    if (currentSort === 'latest') {
        filteredPosts.sort((a, b) => b.data.timestamp - a.data.timestamp);
    } else if (currentSort === 'oldest') {
        filteredPosts.sort((a, b) => a.data.timestamp - b.data.timestamp);
    } 
    
    filteredPosts.sort((a, b) => {
        if (a.data.isPinned && !b.data.isPinned) return -1;
        if (!a.data.isPinned && b.data.isPinned) return 1;
        return 0; 
    });
    
    postKeys = filteredPosts.map(post => ({ id: post.id, data: post.data }));
    
    currentPage = 1;
    displayPage(currentPage); 
}

// --- 6. Pagination Logic ---

function initializePagination() {
    if (isLoading) return;
    isLoading = true;
    loadingIndicator.style.display = 'block';
    
    database.ref('posts').once('value')
        .then(snapshot => {
            const postsObject = snapshot.val();
            allPostsMinimalData = [];
            
            if (postsObject) {
                for (const id in postsObject) {
                    allPostsMinimalData.push({
                        id: id,
                        data: postsObject[id]
                    });
                }
            }

            applyFiltersAndSort();

        })
        .catch(error => {
            console.error("Gagal mengambil data posts:", error);
            mediaFeed.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--deleted-color);">Gagal memuat postingan. Cek koneksi atau aturan keamanan Firebase Anda.</p>';
        })
        .finally(() => {
            isLoading = false;
            loadingIndicator.style.display = 'none';
        });
}


function displayPage(page) {
    mediaFeed.innerHTML = '';
    
    totalPosts = postKeys.length;
    totalPages = Math.max(1, Math.ceil(totalPosts / POSTS_PER_PAGE)); 
    currentPage = Math.min(Math.max(1, page), totalPages); 
    
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const endIndex = Math.min(startIndex + POSTS_PER_PAGE, totalPosts);
    
    const currentPostsToDisplay = postKeys.slice(startIndex, endIndex);

    if (currentPostsToDisplay.length === 0 && totalPosts > 0) {
        currentPage = totalPages;
        displayPage(currentPage);
        return;
    }

    if (totalPosts === 0) {
        mediaFeed.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 20px;">Belum ada postingan di feed ini.</p>';
    } else {
        currentPostsToDisplay.forEach(post => {
            const postElement = createPostElement(post.id, post.data);
            mediaFeed.appendChild(postElement);
        });
    }

    updatePaginationControls();
}


function updatePaginationControls() {
    pageNumbersDisplay.textContent = `Halaman ${currentPage} dari ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
    jumpToPageInput.value = currentPage; 
    jumpToPageInput.max = totalPages;
}

prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        displayPage(currentPage - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

nextPageBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
        displayPage(currentPage + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

jumpToPageBtn.addEventListener('click', () => {
    const page = parseInt(jumpToPageInput.value, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
        displayPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        alert(`Masukkan nomor halaman antara 1 dan ${totalPages}.`);
    }
});


// --- 7. Comment and Modal Logic ---

function openModal(imgElement) {
    const postId = imgElement.getAttribute('data-id');
    const originalUrl = imgElement.getAttribute('data-original-url');
    
    modalImage.src = originalUrl;
    modal.style.display = 'block';
    currentModalPostId = postId;
    
    nicknameInput.value = IS_ADMIN ? sessionStorage.getItem('adminNickname') : sessionStorage.getItem('nickname');
    
    loadComments(postId);
}

window.openModal = openModal; 

function loadComments(postId) {
    commentsList.innerHTML = '';
    const commentsRef = database.ref('comments/' + postId).orderByChild('timestamp');

    commentsRef.on('value', (snapshot) => {
        commentsList.innerHTML = ''; 
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const comment = childSnapshot.val();
                const time = formatTimestamp(comment.timestamp);
                
                const commentDiv = document.createElement('div');
                commentDiv.className = 'comment-item';
                
                // --- KODE PERBAIKAN WARNA ADMIN DIMULAI DI SINI ---
                // Logika pewarnaan mengandalkan pada ID Admin yang berawalan 'admin_eri_'
                const isCommentByAdmin = comment.userId && comment.userId.startsWith('admin_eri_');
                
                // Tentukan kelas admin (INI SELALU BERJALAN)
                const adminClass = isCommentByAdmin ? 'class="admin-nickname"' : '';
                
                // Tentukan tampilan display name
                let displayNameHTML = `<span ${adminClass}>${comment.nickname}</span>`;
                
                // Tambahkan ID sesi HANYA JIKA viewer adalah ADMIN
                if (IS_ADMIN) {
                    const userIdShort = comment.userId.substring(0, 8).toUpperCase();
                    displayNameHTML += ` <span style="font-size: 0.8em; color: #a0aec0;">(${userIdShort})</span>`;
                }
                // --- KODE PERBAIKAN WARNA ADMIN BERAKHIR DI SINI ---

                commentDiv.innerHTML = `
                    <p style="margin: 0; font-size: 0.9em;">${displayNameHTML}</p>
                    <p style="margin: 3px 0; font-size: 1em;">${comment.text}</p>
                    <p style="margin: 0; font-size: 0.7em; color: #a0aec0;">${time}</p>
                `;
                commentsList.appendChild(commentDiv);
            });
            commentsList.scrollTop = commentsList.scrollHeight; 
        } else {
            commentsList.innerHTML = '<p style="text-align: center; color: #a0aec0;">Belum ada komentar.</p>';
        }
    });
}


commentForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const commentText = commentInput.value.trim();
    if (!commentText || !currentModalPostId) return;

    let finalNickname = currentNickname;

    if (IS_ADMIN) {
        finalNickname = sessionStorage.getItem('adminNickname') || 'Administrator';
    } else {
        finalNickname = sessionStorage.getItem('nickname') || 'Anonim User';
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
            fetchCommentCount(currentModalPostId).then(count => {
                updateCommentCountDisplay(currentModalPostId, count);
            });
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
    if (currentModalPostId) {
        database.ref('comments/' + currentModalPostId).off(); 
    }
    currentModalPostId = null; 
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
        modalImage.src = ''; 
        if (currentModalPostId) {
            database.ref('comments/' + currentModalPostId).off();
        }
        currentModalPostId = null; 
    }
}