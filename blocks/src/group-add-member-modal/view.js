import { api, endpoints } from '../_shared/api-client.js';
import store from '../_shared/store.js';

// Module constants
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

jQuery(document).ready(($) => {
    const $block = $('.wp-block-bys-groups-group-add-member-modal'); // first instance
    if (!$block.length) return;

    const $modal = $block.find('#add-member-modal');
    if (!$modal.length) return;

    const $screenUpload = $modal.find('.gaam__screen--upload');
    const $screenReview = $modal.find('.gaam__screen--review');
    const $screenResults = $modal.find('.gaam__screen--results');
    const $alert = $modal.find('.gaam__alert');
    const $fileInput = $modal.find('.upload__input');
    const $templateLink = $modal.find('.gaam__template');
    const $reviewBtn = $modal.find('.gaam__review');
    const $confirmBtn = $modal.find('.gaam__confirm');
    const $backBtn = $modal.find('.gaam__back');
    const $modalFooter = $modal.find('.gaam__footer');
    const $modalInner= $modal.find('.gaam__inner');

    let currentGroupId = null;
    let currentRole = 'learner'; // Set by bys:bulkAddOpened broadcast from group-add-member
    let validEmails = [];
    let invalidEmails = [];
    let previewData = null; // Stores dry_run response; ensures user reviews before confirming

    const $title = $modal.find('.gaam__title');
    const $defaultTitleText = $title.text();
    const $roleValue = $modal.find('.gaam__role-value');

    function syncTitleToRole() {
        if (currentRole === 'leader') {
            $title.text('Bulk Upload Group Leaders');
            $roleValue.text('Group Leader');
        } else {
            $title.text($defaultTitleText);
            $roleValue.text('Learner');
        }
    }

    function closeModal() {
        // Remove Preline's open class and add hidden
        $modal.removeClass('open').addClass('hidden');
        $('html').css('overflow', '');
        // Remove dynamically created Preline backdrop
        $('.hs-overlay-backdrop').remove();

        // Reset state on close
        resetState();
    }

    function resetState() {
        validEmails = [];
        invalidEmails = [];
        previewData = null;
        $modal.find('.gaam__alert--upload').hide().text('');
        $fileInput.val('');
        showScreen('upload');
    }

    function showScreen(screenName) {
        $screenUpload.hide();
        $screenReview.hide();
        $screenResults.hide();
        $reviewBtn.show();
        $confirmBtn.hide();
        $backBtn.hide();

        if (screenName === 'upload') {
            $screenUpload.show();
            $reviewBtn.show();
            $dropzone.show();
        } else if (screenName === 'review') {
            $screenReview.show();
            $reviewBtn.hide();
            $confirmBtn.show();
            $backBtn.show();
        } else if (screenName === 'results') {
            $screenResults.show();
            $confirmBtn.hide();
            $backBtn.hide();
            $reviewBtn.hide();
        }
    }

    // Template download
    $templateLink.on('click', (e) => {
        e.preventDefault();
        const csv = 'email\n';
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'group-enrollment.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });

    // File upload button
    $modal.find('.gaam__upload').on('click', () => {
        $fileInput.click();
    });

    // Drag and drop
    const $dropzone = $modal.find('.gaam__dropzone');
    $dropzone.on('dragover', (e) => {
        e.preventDefault();
        $dropzone.css('background-color', '#f0f4ff');
    });
    $dropzone.on('dragleave', () => {
        $dropzone.css('background-color', '');
    });
    $dropzone.on('drop', (e) => {
        e.preventDefault();
        $dropzone.css('background-color', '');
        const files = e.originalEvent.dataTransfer.files;
        if (files.length) {
            handleFile(files[0]);
        }
    });

    // File input change
    $fileInput.on('change', function() {
        if (this.files.length) {
            handleFile(this.files[0]);
        }
    });

    function handleFile(file) {
        // Validate file type
        if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
            showUploadError('Please upload a valid file type (.csv).');
            return;
        }

        // Parse CSV
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                parseCSV(e.target.result);
            } catch (err) {
                showUploadError(err.message);
            }
        };
        reader.onerror = () => {
            showUploadError('Failed to read file.');
        };
        reader.readAsText(file);
    }

    function parseCSV(content) {
        const lines = content.trim().split('\n');
        if (lines.length < 1) {
            throw new Error('File is empty.');
        }

        // Validate header contains "email" column
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        if (!headers.includes('email')) {
            throw new Error('File must have an "email" column header.');
        }

        // Find email column index
        const emailColumnIndex = headers.indexOf('email');

        // Extract and validate emails
        validEmails = [];
        invalidEmails = [];

        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',');
            const email = row[emailColumnIndex]?.trim();
            if (!email) continue; // Skip empty lines

            if (EMAIL_REGEX.test(email)) {
                validEmails.push(email);
            } else {
                invalidEmails.push(email);
            }
        }

        if (validEmails.length === 0 && invalidEmails.length === 0) {
            throw new Error('No emails found in file.');
        }

        const $uploadAlert = $modal.find('.gaam__alert--upload');
        $uploadAlert.removeClass('gaam__alert--error');
        $fileInput.val(''); // Clear input for re-upload
        $reviewBtn.prop('disabled', false);

        // Show success message
        const totalCount = validEmails.length + invalidEmails.length;
        const successMsg = `Valid file. Found ${totalCount} email(s).`;
        $uploadAlert.text(successMsg).show();
        $dropzone.hide();
    }

    function showUploadError(msg) {
        const $uploadAlert = $modal.find('.gaam__alert--upload');
        $uploadAlert.addClass('gaam__alert--error').text(msg).show();
        $reviewBtn.prop('disabled', true);
        validEmails = [];
        invalidEmails = [];
    }

    // Review button — fetch dry_run preview alongside the "already in role"
    // ID set (members for learner uploads, leaders for leader uploads).
    // Used client-side to bucket existing users into "newly added" vs
    // "already in this role" on the review screen.
    $reviewBtn.on('click', async () => {
        if (!currentGroupId || validEmails.length === 0) return;

        $reviewBtn.prop('disabled', true).text('Loading...');

        try {
            const alreadyInRolePromise = fetchAlreadyInRoleIds(currentGroupId, currentRole);

            const [response, alreadyInRoleIds] = await Promise.all([
                api.post(endpoints.groupInviteBulk(currentGroupId), {
                    emails: validEmails,
                    role: currentRole,
                    dry_run: true,
                }),
                alreadyInRolePromise,
            ]);

            previewData = {
                ...response,
                alreadyInRoleIds, // array; rebuilt as a Set at each consumer
            };
            populateReviewScreen(response, new Set(alreadyInRoleIds));
            showScreen('review');
            $reviewBtn.text('Review Results');
        } catch (err) {
            showUploadError('Failed to preview. Please try again.');
            console.error('[add-member-modal]', err);
            $reviewBtn.text('Review Results');
        } finally {
            $reviewBtn.prop('disabled', false);
        }
    });

    /**
     * Returns the set of user IDs currently in `role` for `groupId` as an
     * array. Reads from the shared store cache when possible, falls back to
     * REST. For role='leader' the response shape from /leaders is an array
     * of leader objects with `.id`; for role='learner' base-user-stats
     * returns `.user_ids`.
     */
    async function fetchAlreadyInRoleIds(groupId, role) {
        const cachedGroup = store.getCurrentGroup() === Number(groupId);

        if (role === 'leader') {
            const cachedLeaders = cachedGroup ? store.getLeaders() : null;
            if (cachedLeaders) {
                return cachedLeaders.map((l) => l.id);
            }
            const leaders = await api.get(endpoints.groupLeaders(groupId));
            return (Array.isArray(leaders) ? leaders : []).map((l) => l.id);
        }

        const cachedUserIds = cachedGroup ? store.getUserIds() : null;
        if (cachedUserIds) return cachedUserIds;

        const stats = await api.get(endpoints.groupBaseUsersStats(groupId));
        return stats?.user_ids || [];
    }

    function populateReviewScreen(data, alreadyInRoleIds) {
        // Cache all DOM selectors once
        const $listAdd = $screenReview.find('.gaam__review--add');
        const $listAlreadyMember = $screenReview.find('.gaam__review--already-member');
        const $listInvite = $screenReview.find('.gaam__review--invite');
        const $listAlreadyInvited = $screenReview.find('.gaam__review--already-invited');
        const $listInvalid = $screenReview.find('.gaam__review--invalid');

        const $sectionAdd = $screenReview.find('.gaam__review-group--add');
        const $sectionAlreadyMember = $screenReview.find('.gaam__review-group--already-member');
        const $sectionInvite = $screenReview.find('.gaam__review-group--invite');
        const $sectionAlreadyInvited = $screenReview.find('.gaam__review-group--already-invited');
        const $sectionInvalid = $screenReview.find('.gaam__review-group--invalid');

        const $countAdd = $screenReview.find('.gaam__review-count--add');
        const $countAlreadyMember = $screenReview.find('.gaam__review-count--already-member');
        const $countInvite = $screenReview.find('.gaam__review-count--invite');
        const $countAlreadyInvited = $screenReview.find('.gaam__review-count--already-invited');
        const $countInvalid = $screenReview.find('.gaam__review-count--invalid');

        // Swap the "Already ___" label to match the upload role.
        $screenReview.find('.gaam__review-label--already-member')
            .text(currentRole === 'leader' ? 'Already leaders' : 'Already members');

        // Clear lists once
        $listAdd.empty();
        $listAlreadyMember.empty();
        $listInvite.empty();
        $listAlreadyInvited.empty();
        $listInvalid.empty();

        // Separate enrolled: those already in this role vs those being added
        const newlyEnrolled = [];
        const alreadyInRole = [];
        (data.enrolled || []).forEach((item) => {
            if (alreadyInRoleIds.has(item.user_id)) {
                alreadyInRole.push(item);
            } else {
                newlyEnrolled.push(item);
            }
        });

        const invitedCount = data.invited?.length || 0;

        // Categorize server-side failed emails:
        // - "Pending invite already exists" = user will be invited (already has pending)
        // - Other failures = truly invalid emails
        const clientSideInvalidCount = invalidEmails.length;
        let alreadyInvitedCount = 0;
        const serverSideInvalidEmails = {};

        (data.failed || []).forEach((item) => {
            if (item.reason === 'Pending invite already exists') {
                alreadyInvitedCount++;
            } else {
                serverSideInvalidEmails[item.email] = item.reason;
            }
        });

        const totalInvalidCount = clientSideInvalidCount + Object.keys(serverSideInvalidEmails).length;
        const totalCount = newlyEnrolled.length + alreadyInRole.length + invitedCount + alreadyInvitedCount + totalInvalidCount;

        // Render newly enrolled users (existing users being added to the role)
        if (newlyEnrolled.length > 0) {
            const addHtml = newlyEnrolled.map(item => `<li>${item.email}</li>`).join('');
            $listAdd.html(addHtml);
        }
        $countAdd.text(`(${newlyEnrolled.length})`);
        $sectionAdd.toggle(newlyEnrolled.length > 0);

        // Render already-in-role users (already members for learner uploads,
        // already leaders for leader uploads).
        if (alreadyInRole.length > 0) {
            const alreadyHtml = alreadyInRole.map(item => `<li>${item.email}</li>`).join('');
            $listAlreadyMember.html(alreadyHtml);
        }
        $countAlreadyMember.text(`(${alreadyInRole.length})`);
        $sectionAlreadyMember.toggle(alreadyInRole.length > 0);

        // Render invited users (new users getting invitations)
        if (invitedCount > 0) {
            const invitedHtml = (data.invited || []).map(item => `<li>${item.email}</li>`).join('');
            $listInvite.html(invitedHtml);
        }
        $countInvite.text(`(${invitedCount})`);
        $sectionInvite.toggle(invitedCount > 0);

        // Render already invited (users with existing pending invites)
        if (alreadyInvitedCount > 0) {
            let alreadyInvitedHtml = '';
            (data.failed || []).forEach((item) => {
                if (item.reason === 'Pending invite already exists') {
                    alreadyInvitedHtml += `<li>${item.email}</li>`;
                }
            });
            $listAlreadyInvited.html(alreadyInvitedHtml);
        }
        $countAlreadyInvited.text(`(${alreadyInvitedCount})`);
        $sectionAlreadyInvited.toggle(alreadyInvitedCount > 0);

        // Render invalid emails (client-side format errors + server-side failures)
        let invalidHtml = '';
        invalidEmails.forEach((email) => {
            invalidHtml += `<li>${email}</li>`;
        });
        Object.keys(serverSideInvalidEmails).forEach((email) => {
            invalidHtml += `<li>${email}</li>`;
        });
        if (invalidHtml) {
            $listInvalid.html(invalidHtml);
        }

        // Show/hide invalid section
        if (totalInvalidCount > 0) {
            $countInvalid.text(`(${totalInvalidCount})`);
            $sectionInvalid.show();
        } else {
            $sectionInvalid.hide();
        }

        // Render or update total count
        const $reviewBody = $screenReview.find('> div').first();
        let $totalCount = $reviewBody.find('.gaam__total-count');
        if ($totalCount.length === 0) {
            $totalCount = $(`<p class="gaam__total-count">Total: ${totalCount} emails</p>`);
            $reviewBody.prepend($totalCount);
        } else {
            $totalCount.text(`Total: ${totalCount} emails`);
        }
    }

    // Back button
    $backBtn.on('click', () => {
        showScreen('upload');
    });

    // Confirm button — process for real
    $confirmBtn.on('click', async () => {
        if (!currentGroupId || !previewData) return;

        $confirmBtn.prop('disabled', true).text('Processing...');

        try {
            const response = await api.post(endpoints.groupInviteBulk(currentGroupId), {
                emails: validEmails,
                role: currentRole,
                dry_run: false,
            });

            // Re-bucket against the "already in this role" set captured at preview time.
            const alreadyInRoleIds = new Set(previewData?.alreadyInRoleIds || []);

            const newlyAdded = [];
            const alreadyInRole = [];
            (response.enrolled || []).forEach((item) => {
                if (alreadyInRoleIds.has(item.user_id)) {
                    alreadyInRole.push(item);
                } else {
                    newlyAdded.push(item);
                }
            });

            // Count pending invites vs truly invalid
            const pendingInvites = (response.failed || []).filter(f => f.reason === 'Pending invite already exists').length;
            const actualFailures = (response.failed || []).length - pendingInvites;
            const invitedCount = (response.invited?.length || 0) + pendingInvites;

            const newlyAddedCount = newlyAdded.length;
            const alreadyInRoleCount = alreadyInRole.length;
            const total = newlyAddedCount + alreadyInRoleCount + invitedCount + actualFailures;

            const alreadyLabel = currentRole === 'leader' ? 'already leader(s)' : 'already member(s)';

            let summary = `Processed ${total} email(s): `;
            if (newlyAddedCount > 0) summary += `${newlyAddedCount} added`;
            if (alreadyInRoleCount > 0) summary += `${newlyAddedCount > 0 ? ', ' : ''}${alreadyInRoleCount} ${alreadyLabel}`;
            if (invitedCount > 0) summary += `${newlyAddedCount > 0 || alreadyInRoleCount > 0 ? ', ' : ''}${invitedCount} invited`;
            if (actualFailures > 0) summary += `${newlyAddedCount > 0 || alreadyInRoleCount > 0 || invitedCount > 0 ? ', ' : ''}${actualFailures} failed`;

            $modal.find('.gaam__alert--results').removeClass('gaam__alert--error').text(summary);
            showScreen('results');
            $confirmBtn.text('Confirm & Add');
            $modalFooter.hide();
            setTimeout(() => {
                closeModal();
                // Refresh page after modal closes (accounting for close animation duration)
                setTimeout(() => {
                    window.location.reload();
                }, 300);
            }, 3000);
            
        } catch (err) {
            showUploadError('Failed to process. Please try again.');
            console.error('[add-member-modal]', err);
            $confirmBtn.text('Confirm & Add');
            showScreen('review');
        } finally {
            $confirmBtn.prop('disabled', false);
        }
    });

    // Track group selection
    $(document).on('bys:groupSelected', (_, { groupId }) => {
        currentGroupId = groupId;
    });

    // Track the role chosen in the parent group-add-member block — fires
    // when the user clicks "Bulk Upload" so we know whether they're
    // uploading learners or leaders. Backend accepts either role.
    $(document).on('bys:bulkAddOpened', (_, { role }) => {
        currentRole = (role === 'leader') ? 'leader' : 'learner';
        syncTitleToRole();
    });

    // Modal close
    function setupCloseHandlers() {
        $modal.find('.gaam__close').on('click', closeModal);
        $modal.find('.modal-backdrop').on('click', closeModal);

        $(document).on('keydown.addMemberModal', (e) => {
            if (e.key === 'Escape' && !$modal.hasClass('hidden')) closeModal();
        });
    }

    // Lock scroll, show upload screen, and remove dynamically created Preline backdrop
    const observer = new MutationObserver(() => {
        if (!$modal.hasClass('hidden')) {
            // Show upload screen when modal opens (for first open or after close/reopen)
            if (!$modal.hasClass('open')) {
                showScreen('upload');
            }
            $('html').css('overflow', 'hidden');
            // Remove Preline's dynamically created backdrop (we use our own .modal-backdrop)
            setTimeout(() => {
                $('.hs-overlay-backdrop').remove();
            }, 0);
        } else {
            $('html').css('overflow', '');
        }
    });
    observer.observe($modal[0], { attributes: true, attributeFilter: ['class'] });

    setupCloseHandlers();
});
