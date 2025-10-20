// firebase.js (VERSI TERBARU: Lazy Loading + Panning + Pin Post + Edit Post + Tombol Buka Postingan untuk Admin + Nama Admin Dapat Diubah + Paginasi Lompat + Rarity)

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
const raritySelect = document.getElementById('rarity-select'); // BARU

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
const lastPageBtn = document.getElementById('last-page-btn'); 
const jumpToPageInput = document.getElementById('jump-to-page-input'); 
const jumpToPageBtn = document.getElementById('jump-to-page-btn'); 

// ELEMEN SORTING
const sortSelect = document.getElementById('sort-select');

// ELEMEN EDIT POST
const editPostModal = document.getElementById('edit-post-modal');
const closeEditBtn = document.getElementById('close-edit-btn');
const editPostForm = document.getElementById('edit-post-form');
const editPostIdInput = document.getElementById('edit-post-id');
const editNicknameInput = document.getElementById('edit-nickname');
const editCaptionInput = document.getElementById('edit-caption');
const editRaritySelect = document.getElementById('edit-rarity-select'); // <--- PERUBAHAN 1: Deklarasi elemen baru
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
const ZOOM_STEP = 10; 

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
    
    if (!currentUserId) {
        currentUserId = Date.now().toString();
        currentNickname = "Anonim User";
        
        sessionStorage.setItem('userId', currentUserId);
        sessionStorage.setItem('nickname', currentNickname);
    }
    
    if (IS_ADMIN) {
        currentUserId = 'admin_eri_' + (auth.currentUser ? auth.currentUser.uid.substring(0, 8) : 'loading'); 
        currentNickname = sessionStorage.getItem('adminNickname') || 'Administrator'; 
        
        sessionStorage.setItem('userId', currentUserId); 
        sessionStorage.setItem('nickname', currentNickname); 
        sessionStorage.setItem('adminNickname', currentNickname); 
    } else {
        currentNickname = sessionStorage.getItem('nickname');
    }

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

function parseFocusPosition(positionString) {
    const parts = positionString.split(' ');
    let x = 50;
    let y = 50;
    if (parts.length === 2) {
        x = parseInt(parts[0].replace('%', ''), 10);
        y = parseInt(parts[1].replace('%', ''), 10);
    }
    return { x: Number(x), y: Number(y) }; 
}

function savePostFocusAndSizeToDB(postId, newFocus, newSize) {
    const updates = { 
        focusPosition: newFocus,
        focusSize: newSize 
    };
    database.ref(`posts/${postId}`).update(updates)
        .then(() => console.log(`Fokus dan ukuran post ${postId} disimpan: ${newFocus} / ${newSize}`))
        .catch(error => console.error('Gagal menyimpan fokus post:', error));
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
    const rarity = raritySelect.value; // BARU: Ambil nilai kelangkaan
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
        rarity: rarity, // BARU: Simpan kelangkaan
        focusPosition: '50% 50%', 
        focusSize: '100%', 
        timestamp: firebase.database.ServerValue.TIMESTAMP 
    };

    database.ref('posts').push(postData)
        .then(() => {
            alert('Media berhasil diunggah! Memuat Feed Baru...');
            
            document.getElementById('caption').value = ''; 
            document.getElementById('thumbnail-url').value = '';
            document.getElementById('original-url').value = '';
            raritySelect.value = 'Silver'; // Reset rarity
            
            mediaFeed.innerHTML = '<h2>Feed Terbaru 🔥</h2>';
            currentPage = 1;
            // Panggil initializePagination() untuk memuat ulang feed setelah posting
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

// ... (Logika Pengaturan Header Wallpaper - Tidak Berubah) ...
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
            
            initializePagination();
        })
        .catch(error => {
            console.error(`Gagal ${action} postingan:`, error);
            alert(`Gagal ${action} postingan.`);
        });
}

// --- 3. Edit Post Logic ---

// <--- PERUBAHAN 2: Tambah currentRarity di signature fungsi dan set nilainya
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

// <--- PERUBAHAN 3: Ambil nilai kelangkaan dan masukkan ke objek update
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
        rarity: newRarity // Masukkan kelangkaan yang baru
    };

    database.ref(`posts/${postId}`).update(updates)
        .then(() => {
            alert("Postingan berhasil diperbarui! Memuat ulang feed...");
            editPostModal.style.display = 'none';
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


// --- 4. Pagination, Post Display, Comment Count, and SORTING LOGIC ---

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
    // BARU: Ambil data kelangkaan
    const rarity = data.rarity || 'Silver'; 

    const postDiv = document.createElement('div');
    // BARU: Tambahkan class rarity
    postDiv.className = `media-post rarity-${rarity.toLowerCase()}`;
    
    if (data.isPinned) {
        postDiv.classList.add('pinned-post');
    }
    
    postDiv.setAttribute('data-id', postId);
    
    const commentCount = data.commentCount !== undefined ? data.commentCount : 'Memuat...';

    const formattedTime = formatTimestamp(data.timestamp); 
    const focusPosition = data.focusPosition || '50% 50%'; 
    const { x: currentX, y: currentY } = parseFocusPosition(focusPosition); 
    const focusSize = data.focusSize || '100%'; 
    
    const deleteButtonHTML = IS_ADMIN ? 
        `<button onclick="deletePost('${postId}')" 
                 style="background: var(--deleted-color); color: white; border: none; padding: 4px 8px; font-size: 0.8em; border-radius: 4px; cursor: pointer; float: right; margin-left: 10px;">
                 Hapus Post
         </button>` 
        : '';
        
    const isPinned = !!data.isPinned;
    const pinButtonText = isPinned ? 'Lepas Pin 📌' : 'Pin Post';
    const pinButtonBg = isPinned ? 'var(--accent-color)' : '#718096'; 
    
    const pinButtonHTML = IS_ADMIN ? 
        `<button onclick="pinPost('${postId}', ${isPinned})" 
                 style="background: ${pinButtonBg}; color: white; border: none; padding: 4px 8px; font-size: 0.8em; border-radius: 4px; cursor: pointer; float: right; margin-left: 10px;">
                 ${pinButtonText}
         </button>` 
        : '';
        
    const sanitizedNickname = (data.anonymousNickname || 'Anonim User').replace(/'/g, "\\'");
    const sanitizedCaption = (data.caption || '').replace(/'/g, "\\'");

    // <--- PERUBAHAN 4: Ambil data kelangkaan dan teruskan ke openEditModal
    const currentRarity = rarity.replace(/'/g, "\\'"); 
    
    const editButtonHTML = IS_ADMIN ? 
        `<button onclick="openEditModal('${postId}', '${sanitizedNickname}', '${sanitizedCaption}', '${currentRarity}')" 
                 style="background: #38a169; color: white; border: none; padding: 4px 8px; font-size: 0.8em; border-radius: 4px; cursor: pointer; float: right; margin-left: 10px;">
                 Edit
         </button>` 
        : '';
        
    const openPostButtonHTML = IS_ADMIN ? 
        `<button onclick="openAdminModal('${postId}')" 
                 style="background: #e67e22; color: white; border: none; padding: 4px 8px; font-size: 0.8em; border-radius: 4px; cursor: pointer; float: right; margin-left: 10px;">
                 Buka Postingan
         </button>` 
        : '';


    const scaleValue = (parseInt(focusSize) / 100).toFixed(2); 
    
    const translateX = currentX - 50; 
    const translateY = currentY - 50; 

    let combinedTransform = `translate(${translateX}%, ${translateY}%) scale(${scaleValue})`;

    if (scaleValue === '1.00' && translateX === 0 && translateY === 0) {
        combinedTransform = 'none';
    }


    const focusControlsHTML = IS_ADMIN ? `
        <div class="focus-controls-overlay">
            <div class="focus-buttons-post">
                <button class="focus-post-btn" data-action="up" data-post-id="${postId}">⬆️</button>
                <div class="mid-row-post">
                    <button class="focus-post-btn" data-action="left" data-post-id="${postId}">⬅️</button>
                    <button class="focus-post-btn" data-action="zoomOut" data-post-id="${postId}">➖</button> 
                    <button class="focus-post-btn" data-action="right" data-post-id="${postId}">➡️</button>
                </div>
                <button class="focus-post-btn" data-action="down" data-post-id="${postId}">⬇️</button>
                <button class="focus-post-btn" data-action="zoomIn" data-post-id="${postId}">➕</button>
            </div>
            <p style="margin-top: 10px; font-size: 0.8em; color: white;">Fokus: ${focusPosition} / Zoom: ${focusSize}</p>
        </div>
    ` : '';
    
    // BARU: Rarity Badge HTML
    const rarityBadgeHTML = `<span class="rarity-badge rarity-${rarity.toLowerCase()}">${rarity}</span>`;


    postDiv.innerHTML = `
        <div class="post-header">
            <p style="margin-bottom: 5px;">
                <strong>${data.anonymousNickname || 'Anonim User'}</strong> 
                <span style="float: right;">${formattedTime}</span>
                ${pinButtonHTML}
                ${deleteButtonHTML} 
                ${editButtonHTML}
                ${openPostButtonHTML} </p>
            <p style="margin-top: 5px; font-size: 0.8em; color: var(--accent-color);">
                ${rarityBadgeHTML} | ${isPinned ? '<span style="color: var(--admin-color); font-weight: bold;">[PIN]</span> | ' : ''}
                <span class="comment-count-display">${commentCount} Komentar</span>
            </p>
        </div>
        <div class="media-container">
            <img src="${data.thumbnailUrl}" alt="Media Thumbnail" 
                 data-original-url="${data.originalMediaUrl}" 
                 data-post-id="${postId}"
                 data-current-zoom="${parseInt(focusSize)}"
                 data-current-focus-x="${currentX}"
                 data-current-focus-y="${currentY}"
                 style="transform: ${combinedTransform}; transition: transform 0.5s ease-in-out;" 
                 onclick="openModal(this)">
            ${focusControlsHTML} 
        </div>
        ${data.caption ? `<div class="post-caption">${data.caption}</div>` : ''}
    `;

    return postDiv;
}


async function initializePagination() {
    if (isLoading) return;
    isLoading = true;
    loadingIndicator.style.display = 'block';
    loadingIndicator.querySelector('p').textContent = `Menginisialisasi ${currentSort} Feed (Hanya ID Post)...`;
    mediaFeed.innerHTML = '<h2>Feed Terbaru 🔥</h2>';
    currentPage = 1; 

    try {
        const snapshot = await database.ref('posts').once('value');
        allPostsMinimalData = [];

        snapshot.forEach((childSnapshot) => {
            const postId = childSnapshot.key;
            const postData = childSnapshot.val();
            
            allPostsMinimalData.push({ 
                id: postId, 
                data: { 
                    timestamp: postData.timestamp,
                    isPinned: postData.isPinned || false,
                    rarity: postData.rarity || 'Silver', // BARU: Ambil data rarity
                    commentCount: 0
                }
            });
        });

        
        // 1. Lakukan Pengurutan berdasarkan data minimal (Timestamp, Pin, Rarity)
        sortPosts(allPostsMinimalData, currentSort);

        // 2. Update postKeys berdasarkan hasil pengurutan
        postKeys = allPostsMinimalData.map(post => post.id);

        totalPosts = postKeys.length;
        totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);

        if (initialPostId) {
            const postIndex = postKeys.findIndex(key => key === initialPostId);
            if (postIndex !== -1) {
                currentPage = Math.floor(postIndex / POSTS_PER_PAGE) + 1;
            }
        }
        
        if (currentPage < 1) currentPage = 1;
        if (totalPages > 0 && currentPage > totalPages) currentPage = totalPages;

        isLoading = false; 
        updatePaginationUI();
        fetchPostsForPage(currentPage);

    } catch (errorObject) {
        console.error('Inisialisasi Pagination/Sorting gagal: ' + errorObject.code, errorObject);
        isLoading = false;
        loadingIndicator.style.display = 'none';
        mediaFeed.innerHTML = '<p style="text-align: center;">Gagal memuat daftar post.</p>';
    }
}

// FUNGSI PENTING: Logika pengurutan (Termasuk Pin Post dan Rarity)
function sortPosts(postsArray, sortType) {
    // BARU: Urutan prioritas kelangkaan
    const rarityOrder = {
        'legendary': 4,
        'epic': 3,
        'gold': 2,
        'silver': 1
    };

    postsArray.sort((a, b) => {
        // Logika Pin Post: Postingan yang di-pin SELALU di urutan teratas
        const isPinnedA = a.data.isPinned || false;
        const isPinnedB = b.data.isPinned || false;

        if (isPinnedA && !isPinnedB) return -1; // A (pinned) lebih tinggi dari B
        if (!isPinnedA && isPinnedB) return 1;  // B (pinned) lebih tinggi dari A
        
        // Jika keduanya pinned atau keduanya tidak pinned
        if (isPinnedA && isPinnedB) {
             // Jika keduanya di-pin, urutkan berdasarkan waktu posting
             return b.data.timestamp - a.data.timestamp;
        }

        // BARU: Sorting berdasarkan Kelangkaan
        if (sortType === 'rarity') {
            const rarityA = rarityOrder[a.data.rarity ? a.data.rarity.toLowerCase() : 'silver'] || 0;
            const rarityB = rarityOrder[b.data.rarity ? b.data.rarity.toLowerCase() : 'silver'] || 0;

            if (rarityB !== rarityA) {
                return rarityB - rarityA; // Rarity DESC (Legendary > Epic > Gold > Silver)
            }
            // Jika kelangkaan sama, fallback ke waktu terbaru
            return b.data.timestamp - a.data.timestamp;
        }

        // Sorting Logika Biasa (Waktu)
        if (sortType === 'latest' || sortType === 'popular') {
            return b.data.timestamp - a.data.timestamp; // Terbaru DESC
        } else if (sortType === 'oldest') {
            return a.data.timestamp - b.data.timestamp; // Terlama ASC
        } 
        
        return 0;
    });
}


async function fetchPostsForPage(page) {
    if (isLoading || totalPosts === 0) return;

    isLoading = true;
    mediaFeed.innerHTML = '';
    loadingIndicator.style.display = 'block';
    loadingIndicator.querySelector('p').textContent = `Memuat Halaman ${page} (Fetch Konten Post)...`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    const startIndex = (page - 1) * POSTS_PER_PAGE;
    const endIndex = Math.min(startIndex + POSTS_PER_PAGE, totalPosts);
    
    const pagePostKeys = postKeys.slice(startIndex, endIndex);

    if (pagePostKeys.length === 0) {
        isLoading = false;
        loadingIndicator.style.display = 'none';
        mediaFeed.innerHTML = '<p style="text-align: center;">Tidak ada media di halaman ini.</p>';
        updatePaginationUI();
        return;
    }

    try {
        const fetchPromises = pagePostKeys.map(async postId => {
            const postSnapshot = await database.ref(`posts/${postId}`).once('value');
            const postData = postSnapshot.val();
            
            postData.commentCount = await fetchCommentCount(postId);
            
            return { id: postId, data: postData };
        });
        
        const postsDataForPage = await Promise.all(fetchPromises);


        postsDataForPage.forEach(post => {
            if (!post.data.focusSize) {
                post.data.focusSize = '100%';
            }
            const postElement = createPostElement(post.id, post.data);
            mediaFeed.appendChild(postElement); 
        });

        if (initialPostId && postsDataForPage.some(p => p.id === initialPostId)) {
            const imgElement = mediaFeed.querySelector(`.media-post[data-id="${initialPostId}"] img`);
            if(imgElement) {
                openModal(imgElement);
                urlParams.delete('postid'); 
                history.replaceState(null, '', 'index.html' + (IS_ADMIN ? `?key=${ADMIN_KEY}` : '')); 
            }
        }

    } catch (error) {
        console.error("Gagal mengambil post untuk halaman:", error);
        mediaFeed.innerHTML = '<p style="text-align: center;">Terjadi kesalahan saat memuat media.</p>';
    } finally {
        isLoading = false;
        loadingIndicator.style.display = 'none';
        updatePaginationUI();
    }
}


function updatePaginationUI() {
    pageNumbersDisplay.textContent = `Halaman ${currentPage} dari ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages || totalPages <= 1 || totalPosts === 0;
    
    lastPageBtn.disabled = currentPage === totalPages || totalPages <= 1 || totalPosts === 0;

    if (totalPosts === 0) {
        pageNumbersDisplay.textContent = "Belum ada media yang diunggah.";
    }
    
    if (currentSort === 'popular' && IS_ADMIN) {
        pageNumbersDisplay.textContent += " (⚠️ Popularitas: Fallback ke Terbaru)";
    }
}

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

lastPageBtn.addEventListener('click', () => {
    if (currentPage < totalPages && totalPages > 0) {
        currentPage = totalPages;
        fetchPostsForPage(currentPage);
    }
});

jumpToPageBtn.addEventListener('click', () => {
    const pageNum = parseInt(jumpToPageInput.value, 10);
    
    if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
        alert(`Masukkan nomor halaman yang valid (1 sampai ${totalPages}).`);
        jumpToPageInput.value = '';
        return;
    }
    
    if (pageNum !== currentPage) {
        currentPage = pageNum;
        fetchPostsForPage(currentPage);
    }
    jumpToPageInput.value = ''; 
});


// EVENT LISTENER UNTUK SORTING
sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    initializePagination(); 
});


document.addEventListener('DOMContentLoaded', initializePagination);


// KODE MODIFIKASI: Logika Event Delegation untuk Kontrol Fokus dan Zoom Postingan
if (IS_ADMIN) {
    mediaFeed.addEventListener('click', function(e) {
        if (!e.target.classList.contains('focus-post-btn')) return;

        const btn = e.target;
        const postId = btn.getAttribute('data-post-id');
        const action = btn.getAttribute('data-action');
        
        const postElement = document.querySelector(`.media-post[data-id="${postId}"]`);
        const imgElement = postElement ? postElement.querySelector('.media-container img') : null;
        const overlay = postElement ? postElement.querySelector('.focus-controls-overlay') : null;

        if (!imgElement || !overlay) return;

        let currentX = parseInt(imgElement.getAttribute('data-current-focus-x') || '50');
        let currentY = parseInt(imgElement.getAttribute('data-current-focus-y') || '50');
        
        let currentZoom = parseInt(imgElement.getAttribute('data-current-zoom') || '100'); 
        
        let newX = currentX;
        let newY = currentY;
        let newZoom = currentZoom;

        let shouldSave = false;

        switch(action) {
            case 'up':
                newY = currentY - FOCUS_STEP;
                shouldSave = true;
                break;
            case 'down':
                newY = currentY + FOCUS_STEP;
                shouldSave = true;
                break;
            case 'left':
                newX = currentX - FOCUS_STEP;
                shouldSave = true;
                break;
            case 'right':
                newX = currentX + FOCUS_STEP;
                shouldSave = true;
                break;
            case 'zoomIn':
                newZoom = Math.min(200, currentZoom + ZOOM_STEP); 
                shouldSave = true;
                break;
            case 'zoomOut':
                newZoom = Math.max(10, currentZoom - ZOOM_STEP);
                shouldSave = true;
                break;
            default:
                return;
        }
        
        if (!shouldSave) return;


        const newFocus = `${newX}% ${newY}%`; 
        const scaleValue = (newZoom / 100).toFixed(2);
        const newSizeText = `${newZoom}%`; 
        
        const translateX = newX - 50; 
        const translateY = newY - 50; 

        let newTransform = `translate(${translateX}%, ${translateY}%) scale(${scaleValue})`;

        if (scaleValue === '1.00' && translateX === 0 && translateY === 0) {
            newTransform = 'none';
        }


        imgElement.style.transform = newTransform;
        imgElement.setAttribute('data-current-zoom', newZoom); 
        imgElement.setAttribute('data-current-focus-x', newX); 
        imgElement.setAttribute('data-current-focus-y', newY); 


        const focusTextDisplay = overlay.querySelector('p');
        if (focusTextDisplay) {
             focusTextDisplay.textContent = `Fokus: ${newFocus} / Zoom: ${newSizeText}`;
        }

        savePostFocusAndSizeToDB(postId, newFocus, newSizeText);
    });
}


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
                allPostsMinimalData = allPostsMinimalData.filter(post => post.id !== postId);
                initializePagination(); 
            })
            .catch(error => {
                console.error("Gagal menghapus postingan:", error);
                alert("Gagal menghapus postingan.");
            });
    }
}

// ... (Sisa fungsi modal dan komentar) ...

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
            fetchCommentCount(postId).then(count => {
                updateCommentCountDisplay(postId, count);
            });

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
    
    if(nicknameInput) nicknameInput.style.display = 'flex'; 
    
    if (IS_ADMIN) {
        if(setNicknameBtn) setNicknameBtn.style.display = 'none'; 
        nicknameInput.value = sessionStorage.getItem('adminNickname') || 'Administrator'; 
    } else {
        if(setNicknameBtn) setNicknameBtn.style.display = 'flex';
        nicknameInput.value = currentNickname; 
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

    let finalNickname;
    
    if (!IS_ADMIN) {
        finalNickname = nicknameInput.value.trim() || currentNickname;
        sessionStorage.setItem('nickname', finalNickname); 
        currentNickname = finalNickname;
    } else {
        const newAdminNickname = nicknameInput.value.trim() || 'Administrator';
        
        sessionStorage.setItem('adminNickname', newAdminNickname);
        currentNickname = newAdminNickname; 
        
        finalNickname = newAdminNickname;
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