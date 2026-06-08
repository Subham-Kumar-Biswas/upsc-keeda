const videoGrid = document.querySelector(".video-cards");
const searchInput = document.querySelector(".search-input");
const errorLog = document.querySelector(".error-log");

const subscribersCountEl = document.querySelector(".subscribers-count");
const videosCountEl = document.querySelector(".videos-count");

const bigTopicCards = document.querySelectorAll(".topic-cards .card-placeholder");
const smallFilterPills = document.querySelectorAll(".filter-topics .topic-filter-card");

const loadMoreBtn = document.querySelector(".load-more");

let visibleCount = 6;
let allMasterVideos = [];
let currentFilteredVideos = [];

const API_KEY = "AIzaSyBKClBK_UxORfOxuzL9woM4WctUk2qxMuc";
const CHANNEL_ID = "UCkS1HoAKOt8xOMPP_16Zz-A";

const YOUTUBE_API_URL = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=snippet&type=video&order=date&maxResults=50`;

const CHANNEL_STATS_URL = `https://www.googleapis.com/youtube/v3/channels?key=${API_KEY}&id=${CHANNEL_ID}&part=statistics`;

async function fetchChannelStats() {
    try {
        const response = await fetch(CHANNEL_STATS_URL);
        if (!response.ok) throw new Error("Failed to fetch channel stats.");
        
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            const stats = data.items[0].statistics;
            
            if (subscribersCountEl && stats.subscriberCount) {
                subscribersCountEl.textContent = Number(stats.subscriberCount).toLocaleString();
            }
            
            if (videosCountEl && stats.videoCount) {
                videosCountEl.textContent = Number(stats.videoCount).toLocaleString();
            }
        }
    } catch (error) {
        console.error("Error fetching channel stats:", error);
    }
}

async function fetchLiveYouTubeVideos() {
    try {
        const response = await fetch(YOUTUBE_API_URL);

        if (!response.ok) {
            throw new Error("YouTube API request failed.");
        }

        const data = await response.json();
        const rawItems = data.items || [];

        if (rawItems.length === 0) {
            displayVideos([]);
            return;
        }

        const videoIds = rawItems
            .filter(item => item.id && item.id.videoId)
            .map(item => item.id.videoId)
            .join(',');

        const detailsResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?key=${API_KEY}&id=${videoIds}&part=contentDetails,snippet`);
        const detailsData = await detailsResponse.json();

        const durationMap = {};
        if (detailsData.items) {
            detailsData.items.forEach(item => {
                durationMap[item.id] = {
                    duration: item.contentDetails.duration,
                    description: item.snippet.description ? item.snippet.description.toLowerCase() : ""
                };
            });
        }

        allMasterVideos = rawItems
            .filter(item => item.id && item.id.videoId) 
            .map(item => {
                return {
                    title: item.snippet.title,
                    videoId: item.id.videoId,
                    topic: detectTopicFromTitle(item.snippet.title)
                };
            })
            .filter(video => {
                const titleLower = video.title.toLowerCase();
                const videoData = durationMap[video.videoId] || { duration: "", description: "" };
                
                if (
                    titleLower.includes("#shorts") || 
                    titleLower.includes("shorts") || 
                    videoData.description.includes("#shorts")
                ) {
                    return false;
                }

                const duration = videoData.duration;
                if (duration.startsWith("PT") && !duration.includes("M") && !duration.includes("H")) {
                    return false; 
                }

                return true;
            });

        currentFilteredVideos = [...allMasterVideos];
        displayVideos(currentFilteredVideos);

    } catch (error) {
        console.error("Error fetching live videos:", error);
        errorLog.classList.remove('hidden');
    }
}

function detectTopicFromTitle(title) {
    const testTitle = title.toLowerCase();
    
    if (testTitle.includes("history") || testTitle.includes("modern india")) {
        return "history";
    }
    if (testTitle.includes("polity") || testTitle.includes("constitution") || testTitle.includes("political")) {
        return "political science"; 
    }
    if (testTitle.includes("geography") || testTitle.includes("map")) {
        return "geography";
    }
    if (testTitle.includes("current affairs") || testTitle.includes("daily news")) {
        return "current affairs";
    }
    
    return "other";
}

function displayVideos(videoArray) {
    videoGrid.innerHTML = "";

    if (videoArray.length === 0) {
        errorLog.classList.remove('hidden');
        loadMoreBtn.classList.add('hidden');
        return;
    }

    errorLog.classList.add('hidden');

    const itemsToRender = videoArray.slice(0, visibleCount);

    itemsToRender.forEach(video => {
        const card = document.createElement('a');
        card.href = `https://www.youtube.com/watch?v=${video.videoId}`;
        card.target = "_blank";
        card.rel = "noopener noreferrer";
        card.classList.add('video-card-link'); 
        card.setAttribute('data-topic', video.topic.toLowerCase());

        card.innerHTML = `
            <div class="video-card">
                <div class="video-thumbnail-wrapper">
                    <img 
                        src="https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg" 
                        alt="${video.title}" 
                        class="video-static-thumbnail"
                        loading="lazy"
                    />
                    <div class="play-overlay-icon">▶</div>
                </div>
                <div class="video-card-content">
                  <span class="video-tag">${video.topic}</span>
                  <h3 class="video-title">${video.title}</h3>
                </div>
            </div>
        `;
        videoGrid.appendChild(card);
    });

    if (visibleCount >= videoArray.length) {
        loadMoreBtn.classList.add('hidden');
    } else {
        loadMoreBtn.classList.remove('hidden');
    }
}

function applyActiveFilters() {
    visibleCount = 6; 

    const activeTopics = [];
    smallFilterPills.forEach(pill => {
        const text = pill.textContent.toLowerCase().trim();
        if (pill.classList.contains("active") && text !== "all") {
            activeTopics.push(text);
        }
    });

    if (activeTopics.length === 0) {
        currentFilteredVideos = [...allMasterVideos];
        
        const allPill = Array.from(smallFilterPills).find(p => p.textContent.toLowerCase().trim() === 'all');
        if (allPill) allPill.classList.add('active');
        
        bigTopicCards.forEach(c => c.classList.remove("active"));
    } else {
        currentFilteredVideos = allMasterVideos.filter(video => 
            activeTopics.includes(video.topic.toLowerCase())
        );

        const allPill = Array.from(smallFilterPills).find(p => p.textContent.toLowerCase().trim() === 'all');
        if (allPill) allPill.classList.remove('active');

        bigTopicCards.forEach(card => {
            const cardText = card.querySelector("h3").textContent.toLowerCase().trim();
            if (activeTopics.includes(cardText)) {
                card.classList.add("active");
            } else {
                card.classList.remove("active");
            }
        });
    }

    displayVideos(currentFilteredVideos);
}

loadMoreBtn.addEventListener("click", () => {
    visibleCount += 6; 
    displayVideos(currentFilteredVideos);
});

searchInput.addEventListener('input', (event) => {
    visibleCount = 6;
    const searchTerm = event.target.value.toLowerCase().trim();

    bigTopicCards.forEach(c => c.classList.remove("active"));
    smallFilterPills.forEach(p => p.classList.remove("active"));

    currentFilteredVideos = allMasterVideos.filter(video => {
        const titleMatches = video.title.toLowerCase().includes(searchTerm);
        const topicMatches = video.topic.toLowerCase().includes(searchTerm);
        return titleMatches || topicMatches;
    });

    displayVideos(currentFilteredVideos);
});

bigTopicCards.forEach(card => {
    card.addEventListener("click", () => {
        const topicText = card.querySelector("h3").textContent.toLowerCase().trim();
        const isAlreadyActive = card.classList.contains("active");

        smallFilterPills.forEach(p => p.classList.remove("active"));
        bigTopicCards.forEach(c => c.classList.remove("active"));

        if (!isAlreadyActive) {
            card.classList.add("active");
            
            smallFilterPills.forEach(pill => {
                const pillText = pill.textContent.toLowerCase().trim();
                if (pillText === topicText) pill.classList.add("active");
            });
        }

        applyActiveFilters();
        document.getElementById("videos").scrollIntoView({ behavior: "smooth" });
    });
});

smallFilterPills.forEach(pill => {
    pill.addEventListener("click", () => {
        const topicText = pill.textContent.toLowerCase().trim();

        if (topicText === "all") {
            smallFilterPills.forEach(p => p.classList.remove("active"));
            bigTopicCards.forEach(c => c.classList.remove("active"));
            pill.classList.add("active");
        } else {
            if (pill.classList.contains("active")) {
                pill.classList.remove("active");
            } else {
                pill.classList.add("active");
            }
        }

        applyActiveFilters();
    });
});

fetchChannelStats();
fetchLiveYouTubeVideos();

const allPill = Array.from(smallFilterPills).find(pill => pill.textContent.toLowerCase().trim() === 'all');
if (allPill) {
    allPill.classList.add('active');
}

const menuToggle = document.getElementById("menu-toggle");
const navLinks = document.querySelectorAll("nav .list a");

navLinks.forEach(link => {
    link.addEventListener("click", () => {
        if (menuToggle) {
            menuToggle.checked = false;
        }
    });
});

const yearSpan = document.getElementById('current-year');
if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
}