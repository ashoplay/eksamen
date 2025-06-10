document.addEventListener('DOMContentLoaded', () => {
    // Initialize Socket.IO
    const socket = io();

    // Configure toastr notifications
    toastr.options = {
        closeButton: true,
        progressBar: true,
        positionClass: "toast-top-right",
        timeOut: 3000
    };

    // Check authentication status on load
    checkAuth();

    // Handle login form
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;

            if (!username || !password) {
                toastr.error('Vennligst fyll ut både brukernavn og passord');
                return;
            }

            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            
            if (response.ok) {
                toastr.success('Logget inn!');
                updateAuthUI(true, data.username);
                const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                loginModal.hide();
                document.getElementById('loginForm').reset();
                location.reload(); // Reload page to update state
            } else {
                toastr.error(data.error || 'Kunne ikke logge inn');
            }
        } catch (error) {
            console.error('Login error:', error);
            toastr.error('Kunne ikke logge inn. Prøv igjen senere.');
        }
    });

    // Handle register form
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const username = document.getElementById('registerUsername').value.trim();
            const password = document.getElementById('registerPassword').value;

            if (!username || !password) {
                toastr.error('Vennligst fyll ut både brukernavn og passord');
                return;
            }

            if (username.length < 3) {
                toastr.error('Brukernavn må være minst 3 tegn');
                return;
            }

            if (password.length < 6) {
                toastr.error('Passord må være minst 6 tegn');
                return;
            }

            const response = await fetch('/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            
            if (response.ok) {
                toastr.success('Registrering vellykket!');
                updateAuthUI(true, data.username);
                const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
                registerModal.hide();
                document.getElementById('registerForm').reset();
                location.reload(); // Reload page to update state
            } else {
                toastr.error(data.error || 'Kunne ikke registrere bruker');
            }
        } catch (error) {
            console.error('Registration error:', error);
            toastr.error('Kunne ikke registrere bruker. Prøv igjen senere.');
        }
    });

    // Handle logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            const response = await fetch('/auth/logout', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                updateAuthUI(false);
                toastr.success('Logget ut!');
                location.reload(); // Reload page to update state
            } else {
                toastr.error('Kunne ikke logge ut');
            }
        } catch (error) {
            console.error('Logout error:', error);
            toastr.error('Kunne ikke logge ut');
        }
    });

    // Check authentication status
    async function checkAuth() {
        try {
            const response = await fetch('/auth/user');
            const data = await response.json();
            updateAuthUI(data.isAuthenticated, data.username);
        } catch (error) {
            console.error('Auth check failed:', error);
            updateAuthUI(false);
        }
    }

    // Update UI based on auth status
    function updateAuthUI(isAuthenticated, username = '') {
        const userSection = document.getElementById('userSection');
        const authSection = document.getElementById('authSection');
        const mainContent = document.getElementById('mainContent');
        const authMessage = document.getElementById('authMessage');
        const usernameSpan = document.getElementById('username');

        if (isAuthenticated) {
            userSection.classList.remove('d-none');
            authSection.classList.add('d-none');
            mainContent.classList.remove('d-none');
            authMessage.classList.add('d-none');
            usernameSpan.textContent = username;
            loadUserFavorites();
        } else {
            userSection.classList.add('d-none');
            authSection.classList.remove('d-none');
            mainContent.classList.add('d-none');
            authMessage.classList.remove('d-none');
        }
    }

    // Handle real-time updates
    socket.on('votesUpdated', (data) => {
        if (data.topFoxes) {
            updateTopFoxes(data.topFoxes);
        }
        if (data.mostVoted) {
            toastr.info(`Rev ${data.mostVoted.imageId} er søtest akkurat nå med ${data.mostVoted.votes} stemmer!`);
        }
        if (data.userFavorites) {
            updateFavoritesList(data.userFavorites);
        }
        if (data.newFoxes && !isUpdatingImages) {
            updateFoxImages(data.newFoxes);
        }
        if (data.votedFox) {
            updateVoteCount(data.votedFox);
        }
    });

    // Handle voting
    document.querySelectorAll('.vote-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const button = e.target;
            const imageId = button.dataset.imageId;
            
            // Disable button temporarily to prevent double clicks
            button.disabled = true;
            
            try {
                const response = await fetch('/api/vote', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ imageId })
                });

                const data = await response.json();

                if (response.ok) {
                    toastr.success('Takk for din stemme!');
                } else {
                    toastr.error(data.error || 'Noe gikk galt ved stemming');
                }
            } catch (error) {
                console.error('Error:', error);
                toastr.error('Kunne ikke registrere stemmen din. Prøv igjen senere.');
            } finally {
                // Re-enable button after a short delay
                setTimeout(() => {
                    button.disabled = false;
                }, 500);
            }
        });
    });

    // Function to update vote count for a specific fox
    function updateVoteCount(votedFox) {
        const voteButtons = document.querySelectorAll('.vote-btn');
        voteButtons.forEach(button => {
            if (button.dataset.imageId === votedFox.imageId.toString()) {
                const voteCount = button.closest('.card-body').querySelector('.vote-count .badge');
                if (voteCount) {
                    voteCount.textContent = `${votedFox.votes} stemmer totalt`;
                }
            }
        });
    }

    // Function to load user's favorites
    async function loadUserFavorites() {
        try {
            const response = await fetch('/api/favorites');
            const favorites = await response.json();
            updateFavoritesList(favorites);
        } catch (error) {
            console.error('Error loading favorites:', error);
        }
    }

    // Function to update favorites list
    function updateFavoritesList(favorites) {
        const container = document.querySelector('.favorites-list');
        if (!container) return;

        container.innerHTML = favorites
            .sort((a, b) => a.rank - b.rank)
            .map(favorite => `
                <div class="col">
                    <div class="card h-100">
                        <img src="${favorite.fox.imageUrl}" class="card-img-top" alt="Mest stemt rev #${favorite.rank}" loading="lazy">
                        <div class="card-body text-center">
                            <p class="card-text">
                                <span class="badge bg-success">Din #${favorite.rank} mest stemte rev</span>
                                <span class="badge bg-info">${favorite.fox.votes} stemmer</span>
                            </p>
                        </div>
                    </div>
                </div>
            `).join('');
    }

    let isUpdatingImages = false;

    // Function to update fox images
    function updateFoxImages(foxes) {
        if (isUpdatingImages) return;
        isUpdatingImages = true;

        const containers = document.querySelectorAll('.fox-container .card');
        const updatePromises = [];
        
        containers.forEach((container, index) => {
            const fox = foxes[index];
            if (fox) {
                const img = container.querySelector('img');
                const voteBtn = container.querySelector('.vote-btn');
                const voteCount = container.querySelector('.vote-count .badge');
                
                const promise = new Promise((resolve) => {
                    const newImg = new Image();
                    newImg.onload = function() {
                        img.src = this.src;
                        img.alt = `Rev nummer ${index + 1}`;
                        voteBtn.dataset.imageId = fox.imageId.toString();
                        if (voteCount) {
                            voteCount.textContent = `${fox.votes || 0} stemmer totalt`;
                        }
                        voteBtn.disabled = false;
                        resolve();
                    };
                    newImg.onerror = () => {
                        voteBtn.disabled = false;
                        resolve();
                    };
                    newImg.src = fox.imageUrl;
                    voteBtn.disabled = true;
                });
                
                updatePromises.push(promise);
            }
        });

        Promise.all(updatePromises).then(() => {
            setTimeout(() => {
                isUpdatingImages = false;
            }, 1000); // Prevent new updates for 1 second
        });
    }

    // Function to update top foxes display
    function updateTopFoxes(topFoxes) {
        const container = document.querySelector('.top-foxes .row');
        if (!container) return;

        container.innerHTML = topFoxes.map((fox, index) => `
            <div class="col">
                <div class="card h-100">
                    <img src="${fox.imageUrl}" class="card-img-top" alt="Populær rev ${index + 1}" loading="lazy">
                    <div class="card-body text-center">
                        <p class="card-text">
                            <span class="badge bg-primary">${fox.votes} stemmer</span>
                            ${fox.favoriteCount > 0 ? `
                            <span class="badge bg-success">${fox.favoriteCount} favoritter</span>
                            ` : ''}
                        </p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Add error handling for images
    document.querySelectorAll('img').forEach(img => {
        img.onerror = function() {
            this.src = 'https://via.placeholder.com/400x300?text=Bilde+ikke+tilgjengelig';
            toastr.warning('Kunne ikke laste inn et revebilde');
            
            const voteBtn = this.closest('.card').querySelector('.vote-btn');
            if (voteBtn) {
                voteBtn.disabled = false;
            }
        };
    });
}); 