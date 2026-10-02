/* ==========================================================================
   AgriSaarthi AI — Agriculture Assistant with Image & Voice Support
   ========================================================================== */

(function ($) {
    'use strict';

    /* ================================================================
       WELCOME SCREEN
       ================================================================ */

    var WELCOME =
        '<div class="welcome">' +

            '<div class="welcome-logo">' +
                '<img src="/static/images/agrisaarthi-logo.png" alt="AgriSaarthi AI">' +
            '</div>' +

            '<p>' +
                'AI-powered assistance for smarter, healthier and more productive farming.' +
            '</p>' +

            '<div class="chips">' +

                '<span class="chip" data-text="I want advice on choosing and growing a crop. First ask me for my location, soil type, water availability, season, and land size. Then provide suitable general crop-growing guidance based on my answers.">' +
                    '<i class="bi bi-flower1"></i>' +
                    ' Crop Advice' +
                '</span>' +

                '<span class="chip" data-text="I want to check my crop for a possible disease. Please ask me to upload a clear photo of the affected leaf, stem, fruit, or plant, and then analyze the image for visible symptoms. Provide the possible disease, observed symptoms, and general management guidance.">' +
                    '<i class="bi bi-bug"></i>' +
                    ' Disease Detection' +
                '</span>' +

                '<span class="chip" data-text="I want to understand the health of my farm soil. First ask me for my soil type, soil pH if available, N-P-K values from a soil test if available, current or planned crop, and water availability. Then explain what the information means and provide general soil-management guidance.">' +
                    '<i class="bi bi-moisture"></i>' +
                    ' Soil Health' +
                '</span>' +

                '<span class="chip" data-text="I need guidance about fertilizers for my crop. First ask me for the crop name, crop growth stage, soil type, recent soil-test N-P-K values if available, and water availability. Then explain the nutrient needs and provide general fertilizer-management guidance. Do not recommend specific pesticide or fertilizer brands, and advise me to follow locally approved labels and agricultural recommendations for exact products and rates.">' +
                    '<i class="bi bi-droplet"></i>' +
                    ' Fertilizer Guide' +
                '</span>' +

            '</div>' +

            '<button class="language-continue welcome-continue" id="startLanguage">' +
                'Continue <i class="bi bi-arrow-right"></i>' +
            '</button>' +

        '</div>';


    /* ================================================================
       LANGUAGE SELECTION SCREEN
       ================================================================ */

    var LANGUAGE_SCREEN =
        '<div class="language-screen">' +

            '<div class="language-logo">' +
                '<img src="/static/images/agrisaarthi-logo.png" alt="AgriSaarthi AI">' +
            '</div>' +

            '<h2>Choose Your Language</h2>' +

            '<p>Select your preferred language to continue</p>' +

            '<div class="language-options">' +

                '<div class="language-option selected" data-lang="English">' +
                    '<span class="lang-icon">🇬🇧</span>' +
                    'English' +
                '</div>' +

                '<div class="language-option" data-lang="Telugu">' +
                    '<span class="lang-icon">🇮🇳</span>' +
                    'తెలుగు' +
                '</div>' +

                '<div class="language-option" data-lang="Kannada">' +
                    '<span class="lang-icon">🇮🇳</span>' +
                    'ಕನ್ನಡ' +
                '</div>' +

                '<div class="language-option" data-lang="Hindi">' +
                    '<span class="lang-icon">🇮🇳</span>' +
                    'हिन्दी' +
                '</div>' +

            '</div>' +

            '<button class="language-continue" id="languageContinue">' +
                'Continue <i class="bi bi-arrow-right"></i>' +
            '</button>' +

        '</div>';


    /* ================================================================
       VARIABLES
       ================================================================ */

    var mediaRecorder = null;
    var audioChunks = [];
    var isRecording = false;
    var isProcessing = false;
    var selectedImage = null;

    var selectedLanguage = 'English';

    /*
     * Stores the full English instruction that will be sent to the AI.
     */
    var pendingQuickAction = null;

    /*
     * Stores the short translated message shown to the user.
     */
    var pendingQuickActionDisplay = null;


    /* ================================================================
       DOM ELEMENTS
       ================================================================ */

    var $messages = $('#chatMessages');
    var $form = $('#chatForm');
    var $input = $('#userInput');
    var $inputBar = $('.input-bar');

    var $sendBtn = $('#sendBtn');
    var $voiceBtn = $('#voiceBtn');
    var $typing = $('#typingIndicator');

    var $audio = $('#audioPlayer');

    var $clearBtn = $('#clearBtn');
    var $themeBtn = $('#themeToggle');
    var $themeIcon = $('#themeIcon');

    var $imageBtn = $('#imageBtn');
    var $imageInput = $('#imageInput');

    var $preview = $('#imagePreview');
    var $previewImg = $('#previewImg');
    var $removeImg = $('#removeImage');


    /* ================================================================
       INITIALIZATION
       ================================================================ */

    $(document).ready(function () {

        initTheme();

        showWelcome();

        updateDate();


        /* Form submit */
        $form.on('submit', handleSend);


        /* Enter key */
        $input.on('keydown', function (e) {

            if (e.key === 'Enter' && !e.shiftKey) {

                e.preventDefault();

                $form.trigger('submit');
            }

        });


        /* Voice */
        $voiceBtn.on('click', toggleRecording);


        /* New Chat */
        $clearBtn.on('click', clearConversation);


        /* Theme */
        $themeBtn.on('click', toggleTheme);


        /* Image button */
        $imageBtn.on('click', function () {

            $imageInput.trigger('click');

        });


        /* Image selection */
        $imageInput.on('change', handleImageSelect);


        /* Remove selected image */
        $removeImg.on('click', clearImage);


        /* ============================================================
           WELCOME → LANGUAGE SCREEN
           ============================================================ */

        $messages.on('click', '#startLanguage', function () {

            showLanguageScreen();

        });


        /* ============================================================
           LANGUAGE SELECTION
           ============================================================ */

        $messages.on('click', '.language-option', function () {

            $('.language-option').removeClass('selected');

            $(this).addClass('selected');

            selectedLanguage = $(this).data('lang');

        });


        /* ============================================================
           LANGUAGE CONTINUE
           ============================================================ */

        $messages.on('click', '#languageContinue', function () {

            /*
             * First open the actual chat screen.
             */
            startChat();


            /*
             * If the user clicked a welcome-screen action,
             * send that action after language selection.
             */
            if (pendingQuickAction) {

                pendingQuickActionDisplay =
                    getQuickActionDisplayText(
                        pendingQuickAction,
                        selectedLanguage
                    );


                /*
                 * Put the full AI instruction into the input.
                 * This is what the backend receives.
                 */
                $input.val(pendingQuickAction);


                /*
                 * Automatically send it.
                 */
                pendingQuickAction = null;

                $form.trigger('submit');

            }

        });


        /* ============================================================
           QUICK ACTION DISPLAY TEXT
           ============================================================ */

        function getQuickActionDisplayText(text, language) {

            /* --------------------------------------------------------
               CROP ADVICE
               -------------------------------------------------------- */

            if (
                text.indexOf(
                    'I want advice on choosing and growing a crop.'
                ) === 0
            ) {

                if (language === 'Telugu') {

                    return 'పంటను ఎంచుకుని సాగు చేయడానికి నాకు సలహా కావాలి.';

                }

                if (language === 'Kannada') {

                    return 'ಬೆಳೆಯನ್ನು ಆಯ್ಕೆ ಮಾಡಿ ಬೆಳೆಯಲು ನನಗೆ ಸಲಹೆ ಬೇಕು.';

                }

                if (language === 'Hindi') {

                    return 'फसल चुनने और उगाने के लिए मुझे सलाह चाहिए।';

                }

                return 'I need advice on choosing and growing a crop.';
            }


            /* --------------------------------------------------------
               DISEASE DETECTION
               -------------------------------------------------------- */

            if (
                text.indexOf(
                    'I want to check my crop for a possible disease.'
                ) === 0
            ) {

                if (language === 'Telugu') {

                    return 'నా పంటకు వచ్చిన వ్యాధిని గుర్తించడానికి నాకు సహాయం కావాలి.';

                }

                if (language === 'Kannada') {

                    return 'ನನ್ನ ಬೆಳೆಗೆ ಬಂದಿರುವ ರೋಗವನ್ನು ಗುರುತಿಸಲು ನನಗೆ ಸಹಾಯ ಬೇಕು.';

                }

                if (language === 'Hindi') {

                    return 'मैं अपनी फसल में संभावित बीमारी की जांच करना चाहता हूँ।';

                }

                return 'I want to check my crop for a possible disease.';
            }


            /* --------------------------------------------------------
               SOIL HEALTH
               -------------------------------------------------------- */

            if (
                text.indexOf(
                    'I want to understand the health of my farm soil.'
                ) === 0
            ) {

                if (language === 'Telugu') {

                    return 'నా పొలం నేల ఆరోగ్యం గురించి తెలుసుకోవాలి.';

                }

                if (language === 'Kannada') {

                    return 'ನನ್ನ ಹೊಲದ ಮಣ್ಣಿನ ಆರೋಗ್ಯವನ್ನು ತಿಳಿದುಕೊಳ್ಳಬೇಕು.';

                }

                if (language === 'Hindi') {

                    return 'मैं अपने खेत की मिट्टी के स्वास्थ्य के बारे में जानना चाहता हूँ।';

                }

                return 'I want to understand the health of my farm soil.';
            }


            /* --------------------------------------------------------
               FERTILIZER GUIDE
               -------------------------------------------------------- */

            if (
                text.indexOf(
                    'I need guidance about fertilizers for my crop.'
                ) === 0
            ) {

                if (language === 'Telugu') {

                    return 'నా పంటకు ఎరువుల గురించి నాకు సలహా కావాలి.';

                }

                if (language === 'Kannada') {

                    return 'ನನ್ನ ಬೆಳೆಗೆ ರಸಗೊಬ್ಬರಗಳ ಬಗ್ಗೆ ನನಗೆ ಸಲಹೆ ಬೇಕು.';

                }

                if (language === 'Hindi') {

                    return 'मुझे अपनी फसल के लिए उर्वरकों के बारे में सलाह चाहिए।';

                }

                return 'I need guidance about fertilizers for my crop.';
            }


            return text;
        }


        /* ============================================================
           QUICK ACTION BUTTONS
           ============================================================ */

        $(document).on('click', '#farmProfileBtn', function () {
            showFarmProfile();
        });

        $messages.on('click', '.chip', function () {

            var text = $(this).data('text');

            if (text) {

                /*
                 * Do NOT send immediately.
                 *
                 * First remember the action and open the
                 * language selection screen.
                 */
                pendingQuickAction = text;

                showLanguageScreen();

            }

        });


        /* ============================================================
           BROWSER NOTIFICATION
           ============================================================ */

        if (
            'Notification' in window &&
            Notification.permission === 'default'
        ) {

            Notification.requestPermission();

        }


        $input.trigger('focus');

    });


    /* ================================================================
       THEME
       ================================================================ */

    function initTheme() {

        if (
            localStorage.getItem('agri-bot-theme') === 'dark'
        ) {

            document.documentElement.setAttribute(
                'data-theme',
                'dark'
            );

            $themeIcon
                .removeClass('bi-moon-stars-fill')
                .addClass('bi-sun-fill');

        }

    }


    function toggleTheme() {

        var dark =
            document.documentElement.getAttribute(
                'data-theme'
            ) === 'dark';


        if (dark) {

            document.documentElement.removeAttribute(
                'data-theme'
            );

        } else {

            document.documentElement.setAttribute(
                'data-theme',
                'dark'
            );

        }


        localStorage.setItem(
            'agri-bot-theme',
            dark ? 'light' : 'dark'
        );


        $themeIcon.toggleClass(
            'bi-moon-stars-fill bi-sun-fill'
        );

    }


    /* ================================================================
       SCREEN HELPERS
       ================================================================ */

    function showFarmProfile() {

        var FARM_PROFILE =

            '<div class="farm-profile-screen">' +

                '<div class="farm-profile-card">' +

                    '<div class="farm-profile-icon">' +
                        '<i class="bi bi-house-heart-fill"></i>' +
                    '</div>' +

                    '<h2>My Farm Profile</h2>' +

                    '<p class="farm-profile-subtitle">' +
                        'Tell AgriSaarthi about your farm for more personalized guidance.' +
                    '</p>' +

                    '<div class="farm-profile-form">' +

                        '<div class="farm-field">' +
                            '<label><i class="bi bi-geo-alt-fill"></i> Location</label>' +
                            '<input type="text" id="farmLocation" placeholder="Example: Andhra Pradesh">' +
                        '</div>' +

                        '<div class="farm-field">' +
                            '<label><i class="bi bi-flower1"></i> Main Crop</label>' +
                            '<input type="text" id="farmCrop" placeholder="Example: Paddy">' +
                        '</div>' +

                        '<div class="farm-field">' +
                            '<label><i class="bi bi-moisture"></i> Soil Type</label>' +
                            '<select id="farmSoil">' +
                                '<option value="">Select soil type</option>' +
                                '<option value="Red Soil">Red Soil</option>' +
                                '<option value="Black Soil">Black Soil</option>' +
                                '<option value="Alluvial Soil">Alluvial Soil</option>' +
                                '<option value="Sandy Soil">Sandy Soil</option>' +
                                '<option value="Clay Soil">Clay Soil</option>' +
                                '<option value="Loamy Soil">Loamy Soil</option>' +
                                '<option value="Other">Other</option>' +
                            '</select>' +
                        '</div>' +

                        '<div class="farm-field">' +
                            '<label><i class="bi bi-droplet-fill"></i> Irrigation Type</label>' +
                            '<select id="farmIrrigation">' +
                                '<option value="">Select irrigation type</option>' +
                                '<option value="Rainfed">Rainfed</option>' +
                                '<option value="Borewell">Borewell</option>' +
                                '<option value="Canal">Canal</option>' +
                                '<option value="Drip Irrigation">Drip Irrigation</option>' +
                                '<option value="Sprinkler">Sprinkler</option>' +
                                '<option value="Other">Other</option>' +
                            '</select>' +
                        '</div>' +

                        '<div class="farm-field">' +
                            '<label><i class="bi bi-rulers"></i> Land Size</label>' +
                            '<input type="text" id="farmLandSize" placeholder="Example: 2 acres">' +
                        '</div>' +

                        '<div class="farm-field">' +
                            '<label><i class="bi bi-bar-chart-fill"></i> Crop Growth Stage</label>' +
                            '<select id="farmStage">' +
                                '<option value="">Select growth stage</option>' +
                                '<option value="Seedling">Seedling</option>' +
                                '<option value="Vegetative">Vegetative</option>' +
                                '<option value="Flowering">Flowering</option>' +
                                '<option value="Fruiting">Fruiting</option>' +
                                '<option value="Maturity">Maturity</option>' +
                                '<option value="Harvesting">Harvesting</option>' +
                            '</select>' +
                        '</div>' +

                    '</div>' +

                    '<button class="farm-save-btn" id="saveFarmProfile">' +
                        '<i class="bi bi-check-circle-fill"></i>' +
                        ' Save Farm Profile' +
                    '</button>' +

                    '<button class="farm-back-btn" id="farmBackBtn">' +
                        '<i class="bi bi-arrow-left"></i>' +
                        ' Back to Chat' +
                    '</button>' +

                '</div>' +

            '</div>';

        $messages.html(FARM_PROFILE);

        $inputBar.hide();
    }


    $(document).on('click', '#saveFarmProfile', function () {

        var farmProfile = {
            location: $('#farmLocation').val().trim(),
            crop: $('#farmCrop').val().trim(),
            soil: $('#farmSoil').val(),
            irrigation: $('#farmIrrigation').val(),
            landSize: $('#farmLandSize').val().trim(),
            growthStage: $('#farmStage').val()
        };

        if (
            !farmProfile.location ||
            !farmProfile.crop ||
            !farmProfile.soil ||
            !farmProfile.irrigation ||
            !farmProfile.landSize ||
            !farmProfile.growthStage
        ) {
            showToast('Please fill in all farm details.');
            return;
        }

        localStorage.setItem(
            'agrisaarthi-farm-profile',
            JSON.stringify(farmProfile)
        );

        showToast('Farm profile saved successfully! 🌱');

    });


    $(document).on('click', '#farmBackBtn', function () {

        startChat();

    });


    function showWelcome() {

        $messages.html(WELCOME);

        $inputBar.hide();

    }


    function showLanguageScreen() {

        $messages.html(LANGUAGE_SCREEN);

        $inputBar.hide();

    }


    function startChat() {

        /*
         * Remove welcome/language content.
         */
        $messages.empty();


        /*
         * IMPORTANT:
         * Show the input bar when actual chat starts.
         */
        $inputBar.css(
            'display',
            'flex'
        );


        $input.attr(
            'placeholder',
            'Ask about crops, pests, soil, or send a photo...'
        );


        $input.trigger('focus');

    }


    function updateDate() {

        $('#dateDisplay').text(
            new Date().toLocaleDateString(
                'en-IN',
                {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                }
            )
        );

    }


    function scrollBottom() {

        $messages
            .stop()
            .animate(
                {
                    scrollTop:
                        $messages[0].scrollHeight
                },
                250
            );

    }


    function getTime() {

        return new Date().toLocaleTimeString(
            [],
            {
                hour: '2-digit',
                minute: '2-digit'
            }
        );

    }


    function showTyping() {

        $typing.addClass('visible');

        scrollBottom();

    }


    function hideTyping() {

        $typing.removeClass('visible');

    }


    function esc(text) {

        var div =
            document.createElement('div');

        div.textContent = text;

        return div.innerHTML;

    }


    /* ================================================================
       IMAGE HANDLING
       ================================================================ */

    function handleImageSelect(e) {

        var file =
            e.target.files[0];


        if (!file) {

            return;

        }


        if (
            file.size >
            4 * 1024 * 1024
        ) {

            showToast(
                'Image too large. Max 4MB allowed.'
            );

            return;

        }


        if (
            !file.type.startsWith('image/')
        ) {

            showToast(
                'Please select an image file.'
            );

            return;

        }


        selectedImage = file;


        var reader =
            new FileReader();


        reader.onload =
            function (event) {

                $previewImg.attr(
                    'src',
                    event.target.result
                );

                $preview.addClass(
                    'active'
                );

            };


        reader.readAsDataURL(file);


        $imageBtn.addClass(
            'active'
        );

    }


    function clearImage() {

        selectedImage = null;


        $imageInput.val('');


        $preview.removeClass(
            'active'
        );


        $previewImg.attr(
            'src',
            ''
        );


        $imageBtn.removeClass(
            'active'
        );

    }


    /* ================================================================
       ADD MESSAGE
       ================================================================ */

    function addMessage(
        text,
        type,
        cache,
        imageUrl
    ) {

        var isUser =
            type === 'user';


        var avatar =
            isUser

                ? '<i class="bi bi-person-fill"></i>'

                : '<img class="msg-avatar-img" src="/static/images/agrisaarthi-icon.png" alt="AgriSaarthi AI">';


        var imgTag =
            imageUrl

                ? '<img class="msg-img" src="' +
                    imageUrl +
                    '" alt="Shared image">'

                : '';


        /*
         * Remove welcome/language screen
         * if a message is added.
         */

        if (
            isUser &&
            (
                $messages.find('.welcome').length ||
                $messages.find('.language-screen').length
            )
        ) {

            $messages.find('.welcome').remove();

            $messages.find(
                '.language-screen'
            ).remove();

        }


        var cacheTag = '';


        if (
            cache &&
            cache.cached_tokens > 0
        ) {

            cacheTag =
                '<span class="cache-tag">' +

                    '<i class="bi bi-lightning-fill"></i>' +

                    cache.hit_rate +

                    '% cached' +

                '</span>';

        }


        var html =

            '<div class="msg ' +
                type +
            '">' +

                '<div class="msg-av">' +

                    avatar +

                '</div>' +


                '<div class="bubble">' +

                    imgTag +


                    '<div>' +

                        esc(text).replace(
                            /\n/g,
                            '<br>'
                        ) +

                    '</div>' +


                    '<div class="msg-meta">' +

                        '<span>' +

                            getTime() +

                        '</span>' +

                        cacheTag +

                    '</div>' +

                '</div>' +

            '</div>';


        $messages.append(
            html
        );


        scrollBottom();

    }
        /* ================================================================
       SEND TEXT OR IMAGE
       ================================================================ */

    function getFarmProfile() {

        var savedProfile = localStorage.getItem(
            'agrisaarthi-farm-profile'
        );

        if (!savedProfile) {
            return null;
        }

        try {
            return JSON.parse(savedProfile);
        } catch (error) {
            return null;
        }
    }


    function handleSend(e) {

        e.preventDefault();


        var text =
            $input.val().trim();


        var hasImage =
            selectedImage !== null;


        if (
            !text &&
            !hasImage
        ) {

            return;

        }


        if (isProcessing) {

            return;

        }


        /*
         * If user sends only an image,
         * use default agricultural analysis question.
         */

        if (
            !text &&
            hasImage
        ) {

            text =
                'What do you see in this image? Please analyze from an agricultural perspective.';

        }


        isProcessing = true;


        $input.val('');


        $sendBtn.prop(
            'disabled',
            true
        );


        $voiceBtn.prop(
            'disabled',
            true
        );


        $imageBtn.prop(
            'disabled',
            true
        );


        /*
         * Save selected image before clearing it.
         */

        var imageToSend =
            selectedImage;


        var imgPreviewUrl =
            imageToSend
                ? $previewImg.attr('src')
                : null;


        /*
         * Show translated quick-action text
         * to the user.
         *
         * The full English instruction is still
         * sent to the backend.
         */

        var displayText =
            pendingQuickActionDisplay ||
            text;


        addMessage(
            displayText,
            'user',
            null,
            imgPreviewUrl
        );


        pendingQuickActionDisplay = null;


        clearImage();


        showTyping();


        /* ============================================================
           IMAGE REQUEST
           ============================================================ */

        if (hasImage) {

            var fd =
                new FormData();


            fd.append(
                'image',
                imageToSend,
                imageToSend.name ||
                'image.jpg'
            );


            fd.append(
                'text',
                text
            );


            /*
             * Send selected language to backend.
             */

            fd.append(
                'language',
                selectedLanguage
            );


            $.ajax({

                url: '/chat',

                type: 'POST',

                data: fd,

                contentType: false,

                processData: false,

                timeout: 60000

            })

            .done(function (response) {

                hideTyping();


                if (response.text) {

                    addMessage(
                        response.text,
                        'bot',
                        response.cache
                    );


                    playVoice(
                        response.voice
                    );

                }

            })

            .fail(function (xhr) {

                hideTyping();


                addMessage(
                    getError(xhr),
                    'bot'
                );

            })

            .always(done);

        }


        /* ============================================================
           TEXT REQUEST
           ============================================================ */

        else {

            $.ajax({

                url: '/chat',

                type: 'POST',

                data: {

                    text: text,

                    language:
                        selectedLanguage,

                    /*
                     * Send the saved Farm Profile
                     * along with the farmer's question.
                     */
                    farm_profile:
                        JSON.stringify(getFarmProfile())

                },

                timeout: 60000

            })

            .done(function (response) {

                hideTyping();


                if (response.text) {

                    addMessage(
                        response.text,
                        'bot',
                        response.cache
                    );


                    playVoice(
                        response.voice
                    );

                }

            })

            .fail(function (xhr) {

                hideTyping();


                addMessage(
                    getError(xhr),
                    'bot'
                );

            })

            .always(done);

        }


        function done() {

            isProcessing = false;


            $sendBtn.prop(
                'disabled',
                false
            );


            $voiceBtn.prop(
                'disabled',
                false
            );


            $imageBtn.prop(
                'disabled',
                false
            );


            $input.trigger(
                'focus'
            );

        }

    }


    /* ================================================================
       VOICE OUTPUT
       ================================================================ */

    function playVoice(src) {

        if (!src) {

            return;

        }


        $audio.attr(
            'src',
            src
        );


        $audio[0]
            .play()
            .catch(function () {});


        if (
            'Notification' in window &&
            Notification.permission === 'granted'
        ) {

            new Notification(
                'AgriSaarthi AI',
                {
                    body:
                        'Voice response ready',

                    icon:
                        '/static/images/favicon.ico'
                }
            );

        }

    }


    /* ================================================================
       ERROR HANDLING
       ================================================================ */

    function getError(xhr) {

        if (
            xhr.status === 400 &&
            xhr.responseJSON
        ) {

            return (
                xhr.responseJSON.error ||
                'Bad request.'
            );

        }


        if (xhr.status === 429) {

            return (
                'Too many requests. Please wait.'
            );

        }


        if (
            xhr.statusText === 'timeout'
        ) {

            return (
                'Request timed out. Try again.'
            );

        }


        return (
            'Something went wrong. Please try again.'
        );

    }


    /* ================================================================
       VOICE RECORDING
       ================================================================ */

    function toggleRecording() {

        if (isRecording) {

            stopRecording();

        } else {

            startRecording();

        }

    }


    async function startRecording() {

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            showToast(
                'Voice not supported.'
            );

            return;

        }


        try {

            var stream =
                await navigator.mediaDevices.getUserMedia(
                    {
                        audio: true
                    }
                );


            audioChunks = [];


            mediaRecorder =
                new MediaRecorder(
                    stream,
                    {
                        mimeType:
                            MediaRecorder.isTypeSupported(
                                'audio/webm;codecs=opus'
                            )

                            ? 'audio/webm;codecs=opus'

                            : 'audio/webm'
                    }
                );


            mediaRecorder.ondataavailable =
                function (event) {

                    if (
                        event.data.size > 0
                    ) {

                        audioChunks.push(
                            event.data
                        );

                    }

                };


            mediaRecorder.onstop =
                function () {

                    sendAudio(
                        new Blob(
                            audioChunks,
                            {
                                type:
                                    'audio/webm'
                            }
                        )
                    );


                    stream
                        .getTracks()
                        .forEach(
                            function (track) {

                                track.stop();

                            }
                        );

                };


            mediaRecorder.onerror =
                function () {

                    showToast(
                        'Mic error.'
                    );


                    stream
                        .getTracks()
                        .forEach(
                            function (track) {

                                track.stop();

                            }
                        );


                    isRecording = false;


                    $voiceBtn.removeClass(
                        'recording'
                    );

                };


            mediaRecorder.start(
                250
            );


            isRecording = true;


            $voiceBtn.addClass(
                'recording'
            );


            showToast(
                'Recording...'
            );

        }

        catch (error) {

            showToast(
                'Mic access denied.'
            );

        }

    }


    function stopRecording() {

        if (
            mediaRecorder &&
            mediaRecorder.state !== 'inactive'
        ) {

            mediaRecorder.stop();

        }


        isRecording = false;


        $voiceBtn.removeClass(
            'recording'
        );

    }


    /* ================================================================
       SEND AUDIO
       ================================================================ */

    function sendAudio(blob) {

        if (isProcessing) {

            return;

        }


        isProcessing = true;


        $sendBtn.prop(
            'disabled',
            true
        );


        $voiceBtn.prop(
            'disabled',
            true
        );


        showTyping();


        var fd =
            new FormData();


        fd.append(
            'audio',
            blob,
            'recording.webm'
        );


        /*
         * Send selected language to backend.
         */

        fd.append(
            'language',
            selectedLanguage
        );


        $.ajax({

            url: '/chat',

            type: 'POST',

            data: fd,

            contentType: false,

            processData: false,

            timeout: 30000

        })

        .done(function (response) {

            hideTyping();


            if (
                response.transcription
            ) {

                addMessage(
                    response.transcription,
                    'user'
                );

            }


            if (response.text) {

                addMessage(
                    response.text,
                    'bot',
                    response.cache
                );


                playVoice(
                    response.voice
                );

            }

        })


        .fail(function () {

            hideTyping();


            addMessage(
                'Could not process audio.',
                'bot'
            );

        })


        .always(function () {

            isProcessing = false;


            $sendBtn.prop(
                'disabled',
                false
            );


            $voiceBtn.prop(
                'disabled',
                false
            );


            $input.trigger(
                'focus'
            );

        });

    }


    /* ================================================================
       CLEAR CONVERSATION
       ================================================================ */

    function clearConversation() {

        if (
            !$messages.find('.msg').length
        ) {

            return;

        }


        if (
            !confirm(
                'Clear this conversation?'
            )
        ) {

            return;

        }


        $.post(
            '/chat/clear',
            function () {

                /*
                 * Reset quick action state too.
                 */

                pendingQuickAction = null;

                pendingQuickActionDisplay = null;


                /*
                 * Reset to default language.
                 */

                selectedLanguage = 'English';


                showWelcome();


                $audio.attr(
                    'src',
                    ''
                );


                $input.trigger(
                    'focus'
                );

            }
        );

    }


    /* ================================================================
       TOAST MESSAGE
       ================================================================ */

    function showToast(message) {

        $('.toast-msg').remove();


        var toast =
            $(
                '<div class="toast-msg">' +

                    '<i class="bi bi-info-circle me-1" ' +
                    'style="color:var(--primary)"></i>' +

                    esc(message) +

                '</div>'
            );


        $('body').append(
            toast
        );


        toast.fadeIn(
            200
        );


        setTimeout(
            function () {

                toast.fadeOut(
                    200,
                    function () {

                        $(this).remove();

                    }
                );

            },
            3000
        );

    }


})(jQuery);