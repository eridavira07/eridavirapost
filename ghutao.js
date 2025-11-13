// firebase.js (VERSI FINAL: Dilengkapi dengan Unggahan Media Massal BBCode)

// --- Konfigurasi dan Setup Firebase (Ganti dengan detail Anda!) ---
const firebaseConfig = {
    apiKey: "AIzaSyBXaR-lcexVcvzG2v-v7CM3MfBRSQEbjK4",
    authDomain: "fetsh-379dd.firebaseapp.com",
    databaseURL: "https://fetsh-379dd-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "fetsh-379dd",
    storageBucket: "fetsh-379dd.firebasestorage.app",
    messagingSenderId: "911954584549",
    appId: "1:911954584549:web:43d075833a7e973209050c",
    measurementId: "G-ER4LHWM73H"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const database = firebase.database();

// ==============================================
// ⭐ PERUBAHAN KRITIS UNTUK MEMISAHKAN KONTEN ⭐
// ==============================================
const SITE_KEY = 'ghutao'; // Kunci pembeda untuk situs ini (GANTI KE 'fetish' DI fetish.js)

// Definisi ulang semua referensi basis data yang dipisahkan
const POSTS_REF = database.ref('posts/' + SITE_KEY); // Akan menyimpan postingan di /posts/roman
const HEADER_CONFIG_REF = database.ref(`config/${SITE_KEY}/headerWallpaper`); // Akan menyimpan di /config/roman/headerWallpaper
const NEWS_TICKER_REF = database.ref(`config/${SITE_KEY}/newsTicker`); // Akan menyimpan di /config/roman/newsTicker
// Komentar tetap menggunakan path 'comments/' karena akan di-link ke ID post unik yang berada di bawah /posts/roman
const COMMENTS_BASE_REF = database.ref('comments'); 
// ==============================================


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
const imgboxLinkInput = document.getElementById('imgbox-link'); 
const mediaForm = document.getElementById('media-form'); 

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

// ==============================================
// [BARU] ELEMEN NEWS TICKER
// ==============================================
const newsTickerBar = document.getElementById('news-ticker-bar');
const tickerTextScroll = document.getElementById('ticker-text-scroll');
const toggleTickerBtn = document.getElementById('toggle-ticker-btn');
const newsTextInput = document.getElementById('news-text-input');
const saveNewsBtn = document.getElementById('save-news-btn');
const addNewsForm = document.getElementById('add-news-form');
const activeNewsList = document.getElementById('active-news-list');
// ==============================================

// ==============================================
// [BARU DITAMBAHKAN] Elemen Unggahan Massal BBCode
// Pastikan elemen-elemen ini ada di index.html Anda
// ==============================================
const bulkMediaForm = document.getElementById('bulk-media-form');
const bulkAdminNicknameInput = document.getElementById('bulk-admin-nickname-input');
const bulkImgboxLinksInput = document.getElementById('bulk-imgbox-links');
const bulkCaptionInput = document.getElementById('bulk-caption');
const bulkSubmitBtn = document.getElementById('bulk-submit-btn');
const bulkUploadStatus = document.getElementById('bulk-upload-status');
// ==============================================


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
let newsList = []; // Daftar Berita untuk Ticker

// Pagination Variables
const POSTS_PER_PAGE = 52; 
let currentPage = 1;
let totalPosts = 0;
let totalPages = 1;
let postKeys = []; 
let isLoading = false; 
let isEditingNewsId = null; // ID Berita yang sedang di Edit


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

/**
 * Mengkonversi link thumbnail Imgbox menjadi Link Asli dan Thumbnail yang benar.
 * @param {string} imgboxUrl Link dari Imgbox, cth: https://thumbs2.imgbox.com/76/bc/jQPtXSfw_b.jpg
 * @returns {{thumbnailUrl: string, originalUrl: string} | null}
 */
function convertImgboxLink(imgboxUrl) {
    if (!imgboxUrl || typeof imgboxUrl !== 'string') return null;

    // Regex untuk mencocokkan pola Imgbox: thumbs[X].imgbox.com/[XX]/[XX]/[ID]_[b|o|t].jpg
    // Catatan: Imgbox juga bisa menggunakan ekstensi lain (PNG, GIF).
    const regex = /imgbox\.com\/(.+?)\/([a-zA-Z0-9]+)_[bt]\.(jpg|jpeg|png|gif)/i;
    const match = imgboxUrl.match(regex);

    if (match && match[2]) {
        const id = match[2];
        const pathPart = match[1] + '/' + id;
        
        // Asumsi standar Imgbox untuk link original adalah _o.
        const originalExt = match[3];
        
        const originalUrl = `https://images2.imgbox.com/${pathPart}_o.${originalExt}`;
        const thumbnailUrl = imgboxUrl; 
        
        return { thumbnailUrl, originalUrl };
    }
    
    return null;
}

/**
 * Menguraikan string BBCode massal dan mengembalikan array objek link.
 * @param {string} bbCodeText String BBCode dari textarea.
 * @returns {Array<{thumbnailUrl: string, originalMediaUrl: string}>} Array post data yang sudah dikonversi.
 */
function parseBBCodeLinks(bbCodeText) {
    const postDataArray = [];
    
    // Regex diperbarui untuk mencocokkan .jpg, .jpeg, .png, dan .gif pada link thumbnail Imgbox.
    // Pola: [URL=https://imgbox.com/ID][IMG]https://thumbs[X].imgbox.com/xx/xx/ID_[b|t].(jpg|png)[/IMG][/URL]
    const bbCodeRegex = /\[URL=(https:\/\/imgbox\.com\/[a-zA-Z0-9]+)\]\[IMG\](https:\/\/thumbs\d+\.imgbox\.com\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-zA-Z0-9]+_[bot]\.(jpg|jpeg|png|gif))\[\/IMG\]\[\/URL\]/g;
    
    let match;
    // Loop melalui semua kecocokan BBCode
    while ((match = bbCodeRegex.exec(bbCodeText)) !== null) {
        const thumbnailUrl = match[2]; // Thumbnail URL lengkap
        
        // Gunakan convertImgboxLink untuk mendapatkan Original URL yang benar
        const convertedLinks = convertImgboxLink(thumbnailUrl); 
        
        if (convertedLinks) {
            postDataArray.push({
                thumbnailUrl: convertedLinks.thumbnailUrl,
                originalMediaUrl: convertedLinks.originalUrl
            });
        } else {
            console.warn(`Gagal mengonversi BBCode (Thumbnail URL tidak valid): ${thumbnailUrl}`);
        }
    }
    
    return postDataArray;
}
// --- AKHIR parseBBCodeLinks YANG DIPERBAIKI ---


// --- 1. Admin UI, Post Submission, dan Header Wallpaper ---

if (IS_ADMIN) {
    uploadFormContainer.style.display = 'block';
    adminNicknameInput.value = currentNickname; 
    
    // [TAMBAHAN] Sinkronisasi Nickname Admin
    if (bulkAdminNicknameInput) {
        bulkAdminNicknameInput.value = adminNicknameInput.value;
        adminNicknameInput.addEventListener('change', () => {
            bulkAdminNicknameInput.value = adminNicknameInput.value;
            sessionStorage.setItem('adminNickname', adminNicknameInput.value);
        });
        bulkAdminNicknameInput.addEventListener('change', () => {
            adminNicknameInput.value = bulkAdminNicknameInput.value;
            sessionStorage.setItem('adminNickname', bulkAdminNicknameInput.value);
        });
    }
    
    // --- Fungsionalitas Auto-Paste saat Fokus ---
    
    async function autoPasteAndSubmit(inputElement, formElement) {
        if (!navigator.clipboard || !navigator.clipboard.readText) {
            console.warn("Clipboard API tidak didukung atau konteks tidak aman.");
            return;
        }

        try {
            const clipboardText = await navigator.clipboard.readText();
            
            if (clipboardText.startsWith('http') && clipboardText.includes('imgbox.com')) {
                inputElement.value = clipboardText;
                console.log("Link Imgbox otomatis ditempel.");
                
                inputElement.dispatchEvent(new Event('change'));
                
                setTimeout(() => {
                    if (document.getElementById('thumbnail-url').value && document.getElementById('original-url').value) {
                         formElement.dispatchEvent(new Event('submit', { bubbles: true }));
                    } else {
                         console.error("Gagal submit otomatis: Link Imgbox tidak valid setelah konversi.");
                    }
                }, 50); 
            }
        } catch (err) {
            console.error('Gagal membaca clipboard, izin ditolak atau tidak ada teks di clipboard:', err);
        }
    }
    
    // Tambahkan listener 'focus' ke input Imgbox
    if (imgboxLinkInput && mediaForm) {
        imgboxLinkInput.addEventListener('focus', function() {
            autoPasteAndSubmit(this, mediaForm);
        });
    }
    // --- AKHIR Fungsionalitas Auto-Paste saat Fokus ---


    // --- EVENT LISTENER BARU UNTUK IMGBOX (LOGIKA KONVERSI LINK ASLI) ---
    if (imgboxLinkInput) {
        imgboxLinkInput.addEventListener('change', function() {
            const link = this.value.trim();
            if (link) {
                const convertedLinks = convertImgboxLink(link);
                if (convertedLinks) {
                    document.getElementById('thumbnail-url').value = convertedLinks.thumbnailUrl;
                    document.getElementById('original-url').value = convertedLinks.originalUrl;
                } else {
                    if (!this.getAttribute('data-autopaste-triggered')) {
                        alert("Format link Imgbox tidak valid! Pastikan itu adalah link thumbnail Imgbox (*_b.jpg atau *_t.png, dll).");
                    }
                    document.getElementById('thumbnail-url').value = '';
                    document.getElementById('original-url').value = '';
                }
            }
        });
    }
    // --- AKHIR EVENT LISTENER LAMA ---

} else {
    uploadFormContainer.style.display = 'none';
}


// --- 1.1. Unggah Tunggal Media ---
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

    // ⭐ PERUBAHAN: Menggunakan POSTS_REF yang baru ⭐
    POSTS_REF.push(postData) 
        .then(() => {
            
            alert('Media berhasil diunggah! Memuat Feed Baru...');
            
            // Bersihkan input setelah unggah
            document.getElementById('imgbox-link').value = ''; 
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


// --- 1.2. [BARU] Unggah Massal BBCode ---
if (IS_ADMIN && bulkMediaForm) {
    bulkMediaForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const adminNickname = bulkAdminNicknameInput.value.trim();
        const linksText = bulkImgboxLinksInput.value.trim();
        const bulkCaption = bulkCaptionInput.value;
        
        if (!adminNickname || !linksText) {
            alert("Nama Admin dan Daftar BBCode wajib diisi.");
            return;
        }

        sessionStorage.setItem('adminNickname', adminNickname);

        // Parsing BBCode untuk mendapatkan daftar link
        const postLinks = parseBBCodeLinks(linksText);
                                   
        if (postLinks.length === 0) {
            alert("Tidak ada BBCode Imgbox yang valid ditemukan. Pastikan formatnya benar: [URL=...][IMG]...[/IMG][/URL] dengan ekstensi gambar yang didukung (JPG, PNG, dll).");
            return;
        }

        bulkSubmitBtn.disabled = true;
        bulkUploadStatus.textContent = `Memulai unggah ${postLinks.length} media...`;
        
        let successCount = 0;
        let failCount = 0;
        
        // Proses setiap post secara berurutan
        for (let i = 0; i < postLinks.length; i++) {
            const linkData = postLinks[i];
            bulkUploadStatus.textContent = `Memproses post ${i + 1} dari ${postLinks.length} (${linkData.thumbnailUrl.substring(0, 40)}...)...`;
            
            const postData = {
                anonymousUserId: currentUserId,
                anonymousNickname: adminNickname,
                caption: bulkCaption,
                thumbnailUrl: linkData.thumbnailUrl, 
                originalMediaUrl: linkData.originalMediaUrl,
                timestamp: firebase.database.ServerValue.TIMESTAMP 
            };
            
            try {
                // ⭐ PERUBAHAN: Menggunakan POSTS_REF yang baru ⭐
                await POSTS_REF.push(postData);
                successCount++;
            } catch (error) {
                console.error(`Gagal mengunggah post #${i+1}:`, error);
                failCount++;
            }
        }
        
        bulkUploadStatus.textContent = `Selesai! Berhasil: ${successCount}. Gagal: ${failCount}. Memuat ulang Feed...`;
        
        // Bersihkan input setelah unggah
        bulkImgboxLinksInput.value = '';
        bulkCaptionInput.value = '';
        
        // Muat ulang feed
        currentPage = 1;
        initializePagination();
        bulkSubmitBtn.disabled = false;
        // Tampilkan status akhir
        setTimeout(() => {
            bulkUploadStatus.textContent = `Unggah massal selesai. Berhasil: ${successCount}. Gagal: ${failCount}.`;
        }, 3000);
    });
}
// --- AKHIR UNGGAH MASSAL ---

// ⭐ PERUBAHAN: Menggunakan HEADER_CONFIG_REF yang baru ⭐
wallpaperSettingForm.addEventListener('submit', function(e) {
    e.preventDefault();
    if (!IS_ADMIN) return;
    const link = wallpaperLinkInput.value.trim();
    if (!link) return alert("Link wallpaper tidak boleh kosong.");
    const btn = setWallpaperBtn;
    btn.disabled = true;
    btn.textContent = 'Menyimpan...';

    let existingFocus = `${currentFocusX}% ${currentFocusY}%`;
    
    // ⭐ PERUBAHAN: Menggunakan HEADER_CONFIG_REF ⭐
    HEADER_CONFIG_REF.once('value').then(snapshot => { 
        const config = snapshot.val();
        if (config && config.focusPosition) {
            existingFocus = config.focusPosition;
        }
        const wallpaperData = {
            url: link,
            focusPosition: existingFocus,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
        // ⭐ PERUBAHAN: Menggunakan HEADER_CONFIG_REF ⭐
        return HEADER_CONFIG_REF.set(wallpaperData); 
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
    // ⭐ PERUBAHAN: Menggunakan HEADER_CONFIG_REF ⭐
    HEADER_CONFIG_REF.update({ focusPosition: newFocus })
        .then(() => console.log('Fokus header disimpan:', newFocus))
        .catch(error => console.error('Gagal menyimpan fokus header:', error));
}

function loadHeaderWallpaper() {
    // ⭐ PERUBAHAN: Menggunakan HEADER_CONFIG_REF ⭐
    HEADER_CONFIG_REF.once('value', (snapshot) => {
        const config = snapshot.val();
        if (config && config.url) {
            headerWallpaperImage.src = config.url;
            // Terapkan posisi fokus jika ada
            if (config.focusPosition) {
                applyFocus(config.focusPosition);
                focusControlPanel.style.display = 'block';
            } else {
                focusControlPanel.style.display = 'block'; 
                // Jika tidak ada fokus, terapkan nilai default
                applyFocus('50% 50%'); 
            }
        } else {
            // Sembunyikan kontrol jika belum ada wallpaper yang diatur
            focusControlPanel.style.display = 'none';
        }
    });
}

// Event Listeners untuk kontrol fokus
if (focusUpBtn) focusUpBtn.onclick = () => { currentFocusY = Math.max(0, currentFocusY - FOCUS_STEP); applyFocus(`${currentFocusX}% ${currentFocusY}%`); saveFocusToDB(); };
if (focusDownBtn) focusDownBtn.onclick = () => { currentFocusY = Math.min(100, currentFocusY + FOCUS_STEP); applyFocus(`${currentFocusX}% ${currentFocusY}%`); saveFocusToDB(); };
if (focusLeftBtn) focusLeftBtn.onclick = () => { currentFocusX = Math.max(0, currentFocusX - FOCUS_STEP); applyFocus(`${currentFocusX}% ${currentFocusY}%`); saveFocusToDB(); };
if (focusRightBtn) focusRightBtn.onclick = () => { currentFocusX = Math.min(100, currentFocusX + FOCUS_STEP); applyFocus(`${currentFocusX}% ${currentFocusY}%`); saveFocusToDB(); };
if (focusResetBtn) focusResetBtn.onclick = () => { applyFocus('50% 50%'); saveFocusToDB(); };

document.addEventListener('DOMContentLoaded', loadHeaderWallpaper);


// --- 2. News Ticker Logic ---

// ⭐ PERUBAHAN: Menggunakan NEWS_TICKER_REF yang baru ⭐
/**
 * Membuat dan menjalankan animasi News Ticker
 * @param {Array<object>} newsArray Array teks berita (dengan properti text)
 */
function displayNewsTicker(newsArray) {
    if (newsArray.length === 0) {
        newsTickerBar.style.display = 'none';
        return;
    }
    // Gabungkan semua berita menjadi satu string panjang
    const combinedText = newsArray.map(n => n.text).join(' | ');
    tickerTextScroll.innerHTML = `<span>${combinedText}</span>`;
    const span = tickerTextScroll.querySelector('span');
    // Perkirakan durasi animasi berdasarkan panjang teks (misalnya 0.2 detik per karakter)
    const textLength = combinedText.length;
    const animationDuration = Math.max(15, textLength * 0.2) + 's'; 
    // Atur ulang animasi
    span.style.animation = 'none';
    span.offsetHeight; // Memaksa reflow
    span.style.animation = `ticker ${animationDuration} linear infinite`;
    newsTickerBar.style.display = 'flex';
}

function loadNewsFromDB() {
    // ⭐ PERUBAHAN: Menggunakan NEWS_TICKER_REF ⭐
    NEWS_TICKER_REF.once('value', (snapshot) => {
        newsList = [];
        snapshot.forEach((childSnapshot) => {
            newsList.push({ 
                id: childSnapshot.key, 
                text: childSnapshot.val().text 
            });
        });

        // Filter berita yang mungkin kosong atau tidak valid
        newsList = newsList.filter(n => n.text && n.text.trim() !== "");

        // Tampilkan News Ticker di UI
        displayNewsTicker(newsList);

        // Muat daftar berita untuk panel Admin
        if (IS_ADMIN) {
            renderAdminNewsList(newsList);
        }
    });
}

// Handler untuk tombol tutup/buka News Ticker
if (toggleTickerBtn) {
    toggleTickerBtn.addEventListener('click', function() {
        if (newsTickerBar.style.display === 'flex') {
            newsTickerBar.style.display = 'none';
            document.body.style.paddingTop = '0';
        } else if (newsList.length > 0) {
            newsTickerBar.style.display = 'flex';
            // Pastikan body memiliki padding jika ticker muncul
            document.body.style.paddingTop = '40px'; 
        }
    });
}

document.addEventListener('DOMContentLoaded', loadNewsFromDB);

// --- [BARU] Logika Admin Panel Berita ---
if (IS_ADMIN) {
    // Fungsi untuk merender daftar berita di panel admin
    function renderAdminNewsList(list) {
        activeNewsList.innerHTML = '';
        if (list.length === 0) {
            activeNewsList.innerHTML = '<li style="border-left: none;">Tidak ada berita aktif.</li>';
            return;
        }
        list.forEach(news => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="news-text-display">${news.text}</span>
                <div class="news-actions">
                    <button class="edit-btn" onclick="editNews('${news.id}', \`${news.text.replace(/`/g, '\\`')}\`)">Edit</button>
                    <button class="delete-btn" onclick="deleteNews('${news.id}')">Hapus</button>
                </div>
            `;
            activeNewsList.appendChild(li);
        });
    }

    addNewsForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const newsText = newsTextInput.value.trim();
        if (!newsText) return;
        
        saveNewsBtn.disabled = true;

        if (isEditingNewsId) {
            // Mode Edit
            // ⭐ PERUBAHAN: Menggunakan NEWS_TICKER_REF ⭐
            NEWS_TICKER_REF.child(isEditingNewsId).update({ text: newsText })
                .then(() => {
                    alert('Berita berhasil diperbarui.');
                    newsTextInput.value = '';
                    saveNewsBtn.textContent = 'Tambah Berita';
                    isEditingNewsId = null;
                    loadNewsFromDB(); // Muat ulang Ticker dan Admin List
                })
                .catch(error => {
                    console.error("Gagal memperbarui berita:", error);
                    alert('Gagal memperbarui berita.');
                })
                .finally(() => {
                    saveNewsBtn.disabled = false;
                });
        } else {
            // Mode Tambah Baru
            // ⭐ PERUBAHAN: Menggunakan NEWS_TICKER_REF ⭐
            NEWS_TICKER_REF.push({ text: newsText, timestamp: firebase.database.ServerValue.TIMESTAMP })
                .then(() => {
                    alert('Berita berhasil ditambahkan.');
                    newsTextInput.value = '';
                    loadNewsFromDB(); // Muat ulang Ticker dan Admin List
                })
                .catch(error => {
                    console.error("Gagal menambah berita:", error);
                    alert('Gagal menambah berita.');
                })
                .finally(() => {
                    saveNewsBtn.disabled = false;
                });
        }
    });

    // Fungsi untuk memulai mode Edit
    window.editNews = function(id, text) {
        isEditingNewsId = id;
        newsTextInput.value = text;
        saveNewsBtn.textContent = 'Simpan Perubahan';
        // Gulir ke atas ke formulir
        newsTextInput.scrollIntoView({ behavior: 'smooth' });
        newsTextInput.focus();
    }

    // Fungsi untuk menghapus berita
    window.deleteNews = function(id) {
        if (confirm("Yakin ingin menghapus berita ini?")) {
            // ⭐ PERUBAHAN: Menggunakan NEWS_TICKER_REF ⭐
            NEWS_TICKER_REF.child(id).remove()
                .then(() => {
                    alert('Berita berhasil dihapus.');
                    loadNewsFromDB(); // Muat ulang Ticker dan Admin List
                })
                .catch(error => {
                    console.error("Gagal menghapus berita:", error);
                    alert('Gagal menghapus berita.');
                });
        }
    }
}


// --- 3. Pagination, Post Display, dan Comment Count (TIDAK BERUBAH) ---
function fetchCommentCount(postId, element) {
    COMMENTS_BASE_REF.child(postId).once('value', (snapshot) => {
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

    const deleteButtonHTML = IS_ADMIN ? `<button onclick="deletePost('${postId}')" style="background: var(--deleted-color); color: white; border: none; padding: 4px 8px; font-size: 0.8em; border-radius: 4px; cursor: pointer; float: right; margin-left: 10px;"> Hapus Post </button>` : '';

    postDiv.innerHTML = `
        <div class="post-header">
            <p style="margin-bottom: 5px;">
                <strong>${data.anonymousNickname || 'Anonim'}</strong> 
                <span style="font-size: 0.8em; color: #a0aec0;">${formattedTime}</span>
                ${deleteButtonHTML}
            </p>
        </div>
        <div class="media-container" onclick="openModal('${data.originalMediaUrl}', '${postId}')">
            <img src="${data.thumbnailUrl}" alt="${data.caption || 'Media Post'}">
        </div>
        <div class="post-caption">${data.caption || ''}</div>
        <div class="post-actions">
            <div class="reactions">
                </div>
            <span class="comment-count-display">... Komentar</span>
        </div>
    `;

    // Ambil hitungan komentar secara asinkron
    fetchCommentCount(postId, postDiv);
    return postDiv;
}

// Fungsi utama untuk inisialisasi atau pemuatan ulang feed
function initializePagination() {
    if (isLoading) return;
    
    const postsRef = POSTS_REF; // Menggunakan POSTS_REF yang sudah dimodifikasi

    isLoading = true;
    loadingIndicator.style.display = 'block';
    
    // 1. Ambil semua kunci (keys) post untuk menentukan total dan urutan
    // ⭐ PERUBAHAN: Menggunakan POSTS_REF ⭐
    postsRef.once('value', (snapshot) => {
        postKeys = [];
        snapshot.forEach((childSnapshot) => {
            // Hanya ambil kunci yang memiliki data yang valid
            if (childSnapshot.val() && childSnapshot.val().thumbnailUrl && childSnapshot.val().originalMediaUrl) {
                 postKeys.push(childSnapshot.key);
            }
        });
        
        // Urutkan kunci berdasarkan timestamp (terbaru di depan)
        // Catatan: Ini mengharuskan post dimuat secara keseluruhan. 
        // Jika basis data terlalu besar, ini tidak efisien. Solusi yang lebih baik adalah menggunakan Index-on di Firebase Rules.
        // Untuk saat ini, kita balik urutan kunci (berharap Firebase mengembalikannya dalam urutan timestamp).
        postKeys.reverse(); 
        
        totalPosts = postKeys.length;
        totalPages = Math.max(1, Math.ceil(totalPosts / POSTS_PER_PAGE));
        
        isLoading = false;
        
        // Muat halaman pertama atau halaman dari URL jika ada
        if (initialPostId) {
            // Logika untuk mencari halaman dari post ID jika diperlukan
            const postIndex = postKeys.indexOf(initialPostId);
            if (postIndex !== -1) {
                currentPage = Math.floor(postIndex / POSTS_PER_PAGE) + 1;
            } else {
                currentPage = 1; 
            }
        }
        
        fetchPostsForPage(currentPage);
    })
    .catch(error => {
        isLoading = false;
        loadingIndicator.style.display = 'none';
        mediaFeed.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Gagal memuat daftar post.</p>';
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
        // Ambil data untuk setiap kunci di halaman ini
        const postPromises = keysForPage.map(key => 
            // ⭐ PERUBAHAN: Menggunakan POSTS_REF.child(key) ⭐
            POSTS_REF.child(key).once('value').then(snapshot => ({ id: key, data: snapshot.val() })) 
        );

        let postsData = await Promise.all(postPromises);

        postsData = postsData
            .filter(post => post.data && post.data.thumbnailUrl && post.data.originalMediaUrl)
            // Pastikan urutan sesuai dengan postKeys (untuk mematuhi urutan DESC)
            .sort((a, b) => postKeys.indexOf(a.id) - postKeys.indexOf(b.id)); 
            
        // Bersihkan placeholder "Tidak ada media" jika ada
        const existingNoMediaMsg = mediaFeed.querySelector('p[style*="Tidak ada media"]');
        if (existingNoMediaMsg) existingNoMediaMsg.remove();


        // PENTING: Cari wrapper untuk penyisipan
        const feedHeaderControlsWrapper = mediaFeed.querySelector('.feed-header-controls');
        let insertionPoint = feedHeaderControlsWrapper ? feedHeaderControlsWrapper.nextSibling : null;


        // Masukkan elemen post
        postsData.forEach(post => {
            const postElement = createPostElement(post.id, post.data);
            if (insertionPoint) {
                mediaFeed.insertBefore(postElement, insertionPoint);
            } else {
                mediaFeed.appendChild(postElement);
            }
        });
        
        // Sembunyikan Loading Indicator setelah selesai
        loadingIndicator.style.display = 'none';

        updatePaginationUI();
        
        // Buka modal jika ada initialPostId di halaman ini
        if (initialPostId) {
            const initialPost = postsData.find(p => p.id === initialPostId);
            if (initialPost) {
                openModal(initialPost.data.originalMediaUrl, initialPost.id);
                initialPostId = null; // Reset setelah dibuka
            }
        }
    } catch (error) {
        console.error("Error fetching posts:", error);
        loadingIndicator.style.display = 'none';
        mediaFeed.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Gagal memuat postingan halaman ini.</p>';
    } finally {
        isLoading = false;
    }
}


function updatePaginationUI() {
    pageNumbersDisplay.textContent = `Halaman ${currentPage} dari ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage >= totalPages;
}

if (prevPageBtn) prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        fetchPostsForPage(currentPage - 1);
    }
});

if (nextPageBtn) nextPageBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
        fetchPostsForPage(currentPage + 1);
    }
});


// --- FUNGSI ADMIN: HAPUS POST ---
window.deletePost = function(postId) {
    if (!IS_ADMIN) {
        alert("Akses ditolak. Hanya Admin yang dapat menghapus postingan.");
        return;
    }

    if (confirm("PERINGATAN! Apakah Anda yakin ingin menghapus postingan ini? Semua komentar terkait juga akan dihapus permanen.")) {
        
        // ⭐ PERUBAHAN: Menggunakan POSTS_REF.child(postId) ⭐
        POSTS_REF.child(postId).remove()
            .then(() => {
                // Hapus juga komentar terkait
                return COMMENTS_BASE_REF.child(postId).remove();
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


// --- FUNGSI KOMENTAR & MODAL (TIDAK BERUBAH) ---
window.deleteComment = function(postId, commentId) {
    if (!IS_ADMIN) {
        alert("Akses ditolak. Hanya Admin yang dapat menghapus komentar.");
        return;
    }
    
    if (confirm("Apakah Anda yakin ingin menghapus komentar ini? Komentar akan ditandai sebagai dihapus.")) {
        COMMENTS_BASE_REF.child(postId).child(commentId).update({
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
    COMMENTS_BASE_REF.child(postId).off(); 
    commentsList.innerHTML = '';
    
    COMMENTS_BASE_REF.child(postId).on('value', (snapshot) => {
        commentsList.innerHTML = '';
        snapshot.forEach((childSnapshot) => {
            const comment = childSnapshot.val();
            const commentId = childSnapshot.key;
            const commentDiv = document.createElement('div');
            commentDiv.className = `comment ${comment.isDeleted ? 'deleted' : ''}`;
            
            const deleteButton = IS_ADMIN ? 
                `<button onclick="deleteComment('${postId}', '${commentId}')" style="background: none; border: none; color: ${comment.isDeleted ? 'red' : 'orange'}; cursor: pointer; float: right; margin-left: 10px; font-size: 0.9em;">${comment.isDeleted ? 'Dihapus' : 'Hapus'}</button>` : '';

            commentDiv.innerHTML = `
                <p style="margin: 0; font-weight: bold; color: ${comment.userId === currentUserId ? '#71c9f8' : (comment.userId.includes('admin_eri') ? '#ffd700' : 'white')};">
                    ${comment.nickname || 'Anonim'} 
                    ${deleteButton}
                </p>
                <p style="margin: 5px 0 0 0; white-space: pre-wrap; word-wrap: break-word;">${comment.text || ''}</p>
                <p style="margin: 5px 0 0 0; font-size: 0.75em; color: #a0aec0;">${formatTimestamp(comment.timestamp)}</p>
            `;
            
            commentsList.appendChild(commentDiv);
        });
        
        // Gulir ke bawah (komentar terbaru)
        commentsList.scrollTop = commentsList.scrollHeight; 
    }, (error) => {
        console.error("Gagal memuat komentar:", error);
        commentsList.innerHTML = '<p style="color: red;">Gagal memuat komentar.</p>';
    });
}

window.openModal = function(originalUrl, postId) {
    currentModalPostId = postId;
    modal.style.display = "block";
    modalImage.src = originalUrl;
    
    // Tampilkan form nickname jika bukan Admin
    if (IS_ADMIN) {
        nicknameInput.style.display = 'none';
        setNicknameBtn.style.display = 'none';
        if(sessionIdDisplay) sessionIdDisplay.textContent = 'ADMIN';
    }
    
    // Inisialisasi input nickname dengan nilai sesi saat ini
    if (nicknameInput && currentNickname) {
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
    if (!commentText) return;

    let finalNickname;
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

    COMMENTS_BASE_REF.child(currentModalPostId).push(commentData)
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
    COMMENTS_BASE_REF.child(currentModalPostId).off(); 
    currentModalPostId = null; 
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
        modalImage.src = ''; 
        commentsList.innerHTML = '';
        COMMENTS_BASE_REF.child(currentModalPostId).off(); 
        currentModalPostId = null; 
    }
}


document.addEventListener('DOMContentLoaded', () => {
    // Panggil initializePagination() di DOMContentLoaded setelah setup
    if (!initialPostId) {
        initializePagination(); 
    }
    // Jika ada initialPostId, initializePagination akan dipanggil di akhir logika tersebut
});