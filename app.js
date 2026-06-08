/* ====================================================================
   Teamcenter & CAD Learning Hub - Frontend Interactivity (app.js)
   ==================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Nav Navigation Handler
    setupNavigation();

    // Code Generators Handler
    setupGenerators();

    // Download Tracker Handler
    setupDownloads();

    // Quiz Portal Handler
    setupQuiz();
});

/* --- Tab Navigation Logic --- */
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabPanes = document.querySelectorAll('.tab-pane');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = item.getAttribute('data-tab');

            // Set active class on nav link
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Display active tab panel
            tabPanes.forEach(pane => {
                pane.classList.remove('active');
                if (pane.id === targetTab) {
                    pane.classList.add('active');
                }
            });
        });
    });
}

/* --- Code Generators Logic --- */
function setupGenerators() {
    // Tab switching inside generators (if any) or selector selection
    const genSelect = document.getElementById('genSelect');
    const formBmide = document.getElementById('formBmide');
    const formItk = document.getElementById('formItk');
    const formAwc = document.getElementById('formAwc');

    if (genSelect) {
        genSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            formBmide.style.display = 'none';
            formItk.style.display = 'none';
            formAwc.style.display = 'none';

            if (val === 'bmide') {
                formBmide.style.display = 'block';
                generateBmideXml();
            } else if (val === 'itk') {
                formItk.style.display = 'block';
                generateItkCode();
            } else if (val === 'awc') {
                formAwc.style.display = 'block';
                generateAwcStylesheet();
            }
        });
    }

    // Attach listeners to input fields to trigger live updates
    const bmideInputs = formBmide.querySelectorAll('input, select');
    bmideInputs.forEach(input => input.addEventListener('input', generateBmideXml));

    const itkInputs = formItk.querySelectorAll('input, select');
    itkInputs.forEach(input => input.addEventListener('input', generateItkCode));

    const awcInputs = formAwc.querySelectorAll('input, select');
    awcInputs.forEach(input => input.addEventListener('input', generateAwcStylesheet));

    // Copy to clipboard handler
    const copyBtn = document.getElementById('btnCopyCode');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const codeEl = document.getElementById('generatedCode');
            navigator.clipboard.writeText(codeEl.innerText)
                .then(() => {
                    const originalText = copyBtn.innerHTML;
                    copyBtn.innerHTML = '✨ Copied!';
                    copyBtn.style.background = 'var(--success)';
                    setTimeout(() => {
                        copyBtn.innerHTML = originalText;
                        copyBtn.style.background = '';
                    }, 1500);
                })
                .catch(err => {
                    console.error('Failed to copy text: ', err);
                });
        });
    }

    // Initialize the default code output
    if (genSelect && genSelect.value === 'bmide') {
        generateBmideXml();
    }
}

// 1. BMIDE XML Generation
function generateBmideXml() {
    const prefix = document.getElementById('bmidePrefix').value || 'd4';
    const objName = document.getElementById('bmideName').value || 'PartRevision';
    const parentObj = document.getElementById('bmideParent').value || 'ItemRevision';
    const display = document.getElementById('bmideDisplay').value || 'Custom Part Revision';

    const formattedObjName = prefix.toLowerCase() + '_' + objName;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TcTemplate xmlns="http://geolus.com/tc/2010-04/Schema" Name="${prefix}_template">
  <!-- Business Object Definition -->
  <BusinessObject name="${formattedObjName}" 
                  parentName="${parentObj}" 
                  custom="true" 
                  isAbstract="false">
    <DisplayName>${display}</DisplayName>
    
    <!-- Attribute Customization -->
    <TcAttribute name="${prefix}_material" 
                 type="String" 
                 length="128" 
                 custom="true">
      <DisplayName>Material Grade</DisplayName>
      <Description>Specifies chemical composition of CAD Part</Description>
    </TcAttribute>
    
    <TcAttribute name="${prefix}_weight" 
                 type="Double" 
                 custom="true">
      <DisplayName>Calculated Mass (kg)</DisplayName>
    </TcAttribute>
  </BusinessObject>
</TcTemplate>`;

    renderCode(xml, 'xml');
}

// 2. ITK C/C++ Code Generation
function generateItkCode() {
    const handlerType = document.getElementById('itkHandlerType').value;
    const functionName = document.getElementById('itkFuncName').value || 'verifyPartMaterial';
    const errorMsg = document.getElementById('itkErrorMsg').value || 'Material grade must not be empty!';
    
    let template = '';
    
    if (handlerType === 'action') {
        template = `#include <tc/tc_startup.h>
#include <tcserver/sub_svr_err.h>
#include <epm/epm.h>
#include <tccore/item.h>

/**
 * Custom ITK Action Handler: ${functionName}
 * Description: Executed during workflow task transition.
 */
extern int ${functionName}(EPM_action_message_t message) {
    int status = ITK_ok;
    tag_t root_task = NULL_TAG;
    int num_attachments = 0;
    tag_t* attachments = NULL;

    printf("[INFO] Initiating ${functionName} handler execution...\\n");

    // Fetch the root task of the workflow
    status = EPM_ask_root_task(message.task, &root_task);
    if (status != ITK_ok) return status;

    // Fetch Target Attachments
    status = EPM_ask_attachments(root_task, EPM_target_attachment, &num_attachments, &attachments);
    if (status != ITK_ok) return status;

    for (int i = 0; i < num_attachments; i++) {
        tag_t object = attachments[i];
        char* name = NULL;
        
        status = WSOM_ask_name2(object, &name);
        if (status == ITK_ok) {
            printf("[INFO] Auditing Target Object: %s\\n", name);
            SAFE_SM_FREE(name);
        }
    }

    SAFE_SM_FREE(attachments);
    return ITK_ok;
}`;
    } else {
        template = `#include <tc/tc_startup.h>
#include <epm/epm.h>
#include <tccore/aom.h>

/**
 * Custom ITK Rule Handler: ${functionName}
 * Description: Decides if a transition can proceed. Returns EPM_go or EPM_nogo.
 */
extern EPM_decision_t ${functionName}(EPM_rule_message_t message) {
    int status = ITK_ok;
    tag_t root_task = NULL_TAG;
    int num_attachments = 0;
    tag_t* attachments = NULL;
    EPM_decision_t decision = EPM_go;

    printf("[INFO] Evaluating workflow rule: ${functionName}\\n");

    status = EPM_ask_root_task(message.task, &root_task);
    if (status != ITK_ok) return EPM_nogo;

    status = EPM_ask_attachments(root_task, EPM_target_attachment, &num_attachments, &attachments);
    if (status != ITK_ok) return EPM_nogo;

    // Run business validation rule
    logical isValid = TRUE;
    
    // Check validation checks...
    if (!isValid) {
        EMH_store_initial_error_with_status(EMH_severity_error, 911001);
        printf("[ERROR] Rule validation failed: ${errorMsg}\\n");
        decision = EPM_nogo;
    }

    SAFE_SM_FREE(attachments);
    return decision;
}`;
    }

    renderCode(template, 'cpp');
}

// 3. AWC XML Stylesheet Generation
function generateAwcStylesheet() {
    const layoutType = document.getElementById('awcLayout').value;
    const tabName = document.getElementById('awcTabName').value || 'CAD Details';
    const fieldPrefix = document.getElementById('awcFieldPrefix').value || 'd4';

    const xml = `<rendering xmlns="http://geolus.com/tc/2014-07/Rendering">
  <header>
    <image source="type" />
    <title source="object_name" />
    <subTitle source="object_type" />
  </header>
  
  <!-- Active Workspace Tab Layout -->
  <page title="${tabName}" visibleWhen="active_object_type==${fieldPrefix}_PartRevision">
    <column width="${layoutType === 'dual' ? '50%' : '100%'}">
      <section title="Key Attributes">
        <property name="${fieldPrefix}_material" renderingHint="textbox" />
        <property name="${fieldPrefix}_weight" renderingHint="real" />
        <property name="gov_classification" renderingHint="label" />
      </section>
      
      <section title="System Info">
        <property name="owning_user" />
        <property name="owning_group" />
        <property name="last_mod_date" />
      </section>
    </column>
    ${layoutType === 'dual' ? `
    <column width="50%">
      <section title="CAD Attachments">
        <objectSet source="IMAN_specification.Dataset" 
                   columns="object_name,object_type,last_mod_date" 
                   sortDirection="descending" />
      </section>
    </column>` : ''}
  </page>
</rendering>`;

    renderCode(xml, 'xml');
}

// Helper to inject syntax highlight markup (simple string replace tokens)
function renderCode(code, lang) {
    const codeEl = document.getElementById('generatedCode');
    if (!codeEl) return;

    let html = code;

    // Simple escaping
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    if (lang === 'xml') {
        html = html.replace(/(&lt;\/?[a-zA-Z0-9_\-]+)/g, '<span class="tag">$1</span>')
                   .replace(/(\??&gt;)/g, '<span class="tag">$1</span>')
                   .replace(/( [a-zA-Z0-9_\-]+==)/g, '<span class="keyword">$1</span>')
                   .replace(/(".*?")/g, '<span class="string">$1</span>')
                   .replace(/(&lt;!--.*?--&gt;)/g, '<span class="comment">$1</span>');
    } else if (lang === 'cpp') {
        const keywords = ['#include', 'extern', 'int', 'char', 'double', 'float', 'void', 'if', 'return', 'for', 'logical', 'TRUE', 'FALSE', 'NULL_TAG', 'SAFE_SM_FREE', 'EPM_decision_t', 'EPM_go', 'EPM_nogo', 'EPM_action_message_t', 'EPM_rule_message_t'];
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'g');
            html = html.replace(regex, `<span class="keyword">${keyword}</span>`);
        });
        html = html.replace(/(".*?")/g, '<span class="string">$1</span>')
                   .replace(/(\/\/.*)/g, '<span class="comment">$1</span>')
                   .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');
    }

    codeEl.innerHTML = html;
}


/* --- Download Trigger Handler --- */
function setupDownloads() {
    const downloadBtns = document.querySelectorAll('.btn-download');

    downloadBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const fileName = btn.getAttribute('data-file');
            
            // Set download action visual cue
            const originalText = btn.innerHTML;
            btn.innerHTML = '⏳ Initializing...';
            btn.style.opacity = '0.7';

            setTimeout(() => {
                btn.innerHTML = '⬇️ Downloading...';
                
                // Trigger actual download from the local subdirectory
                const downloadLink = document.createElement('a');
                downloadLink.href = 'tools/' + fileName;
                downloadLink.download = fileName;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                
                setTimeout(() => {
                    btn.innerHTML = '✅ Downloaded';
                    btn.style.opacity = '1';
                    btn.style.background = 'var(--success)';
                    btn.style.color = '#fff';
                    
                    setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.style.background = '';
                        btn.style.color = '';
                    }, 2000);
                }, 1000);
            }, 800);
        });
    });
}


/* --- Quiz Engine Logic --- */
const QUIZ_QUESTIONS = [
    {
        question: "In Teamcenter BMIDE, what is the default parent object for custom revisions?",
        options: [
            "Item",
            "Dataset",
            "ItemRevision",
            "Form"
        ],
        answer: 2
    },
    {
        question: "Which ITK return code indicates that a function completed execution successfully?",
        options: [
            "ITK_error",
            "ITK_ok",
            "AOM_ok",
            "EPM_go"
        ],
        answer: 1
    },
    {
        question: "What type of handler is used to stop a workflow process transition if a validation rule fails?",
        options: [
            "Action Handler",
            "Rule Handler",
            "Query Handler",
            "Custom Method"
        ],
        answer: 1
    },
    {
        question: "In Active Workspace (AWC), which XML tag is used to create a new layout tab in a Stylesheet?",
        options: [
            "<section>",
            "<table>",
            "<page>",
            "<column>"
        ],
        answer: 2
    },
    {
        question: "Which environment variable must you source first to execute administrative command utilities in a shell?",
        options: [
            "tc_profilevars",
            "TC_ROOT",
            "TC_DATA",
            "tcserver"
        ],
        answer: 0
    }
];

let currentQuestionIndex = 0;
let selectedAnswers = Array(QUIZ_QUESTIONS.length).fill(null);
let scorePercent = 0;

function setupQuiz() {
    const startBtn = document.getElementById('btnStartQuiz');
    const quizIntro = document.getElementById('quizIntro');
    const quizContent = document.getElementById('quizContent');
    const quizResults = document.getElementById('quizResults');
    const prevBtn = document.getElementById('btnPrevQuestion');
    const nextBtn = document.getElementById('btnNextQuestion');
    const submitBtn = document.getElementById('btnSubmitQuiz');
    const restartBtn = document.getElementById('btnRestartQuiz');

    if (startBtn) {
        startBtn.addEventListener('click', () => {
            quizIntro.style.display = 'none';
            quizContent.style.display = 'block';
            currentQuestionIndex = 0;
            selectedAnswers.fill(null);
            showQuestion();
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                showQuestion();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
                currentQuestionIndex++;
                showQuestion();
            }
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            calculateAndDisplayResults();
        });
    }

    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            quizResults.style.display = 'none';
            quizIntro.style.display = 'block';
            document.getElementById('certSection').style.display = 'none';
        });
    }
}

function showQuestion() {
    const qCountText = document.getElementById('questionCount');
    const qText = document.getElementById('questionText');
    const oList = document.getElementById('optionsList');
    const prevBtn = document.getElementById('btnPrevQuestion');
    const nextBtn = document.getElementById('btnNextQuestion');
    const submitBtn = document.getElementById('btnSubmitQuiz');

    const q = QUIZ_QUESTIONS[currentQuestionIndex];
    qCountText.innerText = `Question ${currentQuestionIndex + 1} of ${QUIZ_QUESTIONS.length}`;
    qText.innerText = q.question;
    oList.innerHTML = '';

    q.options.forEach((opt, idx) => {
        const item = document.createElement('li');
        item.className = 'option-item';
        if (selectedAnswers[currentQuestionIndex] === idx) {
            item.classList.add('selected');
        }
        item.innerText = opt;
        
        item.addEventListener('click', () => {
            selectedAnswers[currentQuestionIndex] = idx;
            document.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            
            // Auto advance or show submit button
            updateQuizButtonsState();
        });
        oList.appendChild(item);
    });

    // Navigation buttons state
    prevBtn.style.display = currentQuestionIndex === 0 ? 'none' : 'inline-flex';
    nextBtn.style.display = currentQuestionIndex === QUIZ_QUESTIONS.length - 1 ? 'none' : 'inline-flex';
    submitBtn.style.display = currentQuestionIndex === QUIZ_QUESTIONS.length - 1 ? 'inline-flex' : 'none';

    updateQuizButtonsState();
}

function updateQuizButtonsState() {
    const nextBtn = document.getElementById('btnNextQuestion');
    const submitBtn = document.getElementById('btnSubmitQuiz');
    const hasSelected = selectedAnswers[currentQuestionIndex] !== null;

    if (nextBtn) nextBtn.disabled = !hasSelected;
    if (submitBtn) submitBtn.disabled = !hasSelected;

    // Visual helper
    if (nextBtn) nextBtn.style.opacity = hasSelected ? '1' : '0.5';
    if (submitBtn) submitBtn.style.opacity = hasSelected ? '1' : '0.5';
}

function calculateAndDisplayResults() {
    const quizContent = document.getElementById('quizContent');
    const quizResults = document.getElementById('quizResults');
    const scoreVal = document.getElementById('scoreValue');
    const scoreText = document.getElementById('scoreText');
    const certSection = document.getElementById('certSection');

    let correctCount = 0;
    selectedAnswers.forEach((ans, idx) => {
        if (ans === QUIZ_QUESTIONS[idx].answer) {
            correctCount++;
        }
    });

    scorePercent = Math.round((correctCount / QUIZ_QUESTIONS.length) * 100);

    quizContent.style.display = 'none';
    quizResults.style.display = 'block';

    scoreVal.innerText = `${scorePercent}%`;

    if (scorePercent >= 70) {
        scoreText.innerHTML = `🌟 **Congratulations!** You passed with flying colors. You have unlocked your Certificate of Completion!`;
        scoreText.style.color = 'var(--success)';
        certSection.style.display = 'flex';
        
        // Let form name capture
        const generateCertBtn = document.getElementById('btnGenerateCert');
        if (generateCertBtn) {
            generateCertBtn.onclick = () => {
                const nameInput = document.getElementById('certNameInput').value.trim() || 'Teamcenter Developer';
                generateCertificateCanvas(nameInput);
            };
        }
    } else {
        scoreText.innerHTML = `❌ **Keep Learning!** You scored less than the passing threshold of 70%. Try again to unlock the certificate.`;
        scoreText.style.color = 'var(--error)';
        certSection.style.display = 'none';
    }
}

/* --- Canvas Certificate Generator --- */
function generateCertificateCanvas(studentName) {
    const canvas = document.getElementById('certCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Clear and set sizes
    canvas.width = 800;
    canvas.height = 550;

    // 1. Draw Background
    const bgGrad = ctx.createLinearGradient(0, 0, 800, 550);
    bgGrad.addColorStop(0, '#0d0f17');
    bgGrad.addColorStop(1, '#05070a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 800, 550);

    // 2. Draw Decorative Borders
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, 760, 510);

    ctx.strokeStyle = 'rgba(127, 0, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(25, 25, 750, 500);

    // Draw Corner Accents
    ctx.fillStyle = '#00f2fe';
    // Top Left
    ctx.fillRect(20, 20, 30, 4);
    ctx.fillRect(20, 20, 4, 30);
    // Top Right
    ctx.fillRect(750, 20, 30, 4);
    ctx.fillRect(776, 20, 4, 30);
    // Bottom Left
    ctx.fillRect(20, 526, 30, 4);
    ctx.fillRect(20, 496, 4, 30);
    // Bottom Right
    ctx.fillRect(750, 526, 30, 4);
    ctx.fillRect(776, 496, 4, 30);

    // 3. Draw Watermark Badge (Background Circle)
    ctx.beginPath();
    ctx.arc(400, 275, 120, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 242, 254, 0.02)';
    ctx.fill();

    // 4. Draw Texts
    // Certificate Title
    ctx.font = '800 24px "Inter", sans-serif';
    ctx.fillStyle = '#00f2fe';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFICATE OF ACCOMPLISHMENT', 400, 90);

    ctx.font = '300 13px "Inter", sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('THIS CERTIFIES THAT', 400, 145);

    // Student Name
    ctx.font = 'bold 36px "Inter", sans-serif';
    // Text Gradient
    const nameGrad = ctx.createLinearGradient(300, 0, 500, 0);
    nameGrad.addColorStop(0, '#ffffff');
    nameGrad.addColorStop(1, '#9b51e0');
    ctx.fillStyle = nameGrad;
    ctx.fillText(studentName.toUpperCase(), 400, 205);

    // Subtitle text
    ctx.font = '400 15px "Inter", sans-serif';
    ctx.fillStyle = '#d1d5db';
    ctx.fillText('has successfully completed the curriculum and assessment requirements for', 400, 260);

    ctx.font = 'bold 20px "Inter", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Teamcenter Customization & CAD Integration Core', 400, 300);

    // Date
    const today = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    ctx.font = '400 12px "Inter", sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.fillText(`Awarded on ${today}`, 400, 340);

    // 5. Draw Signatures Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    // Left Sig
    ctx.beginPath();
    ctx.moveTo(180, 440);
    ctx.lineTo(320, 440);
    ctx.stroke();

    // Right Sig
    ctx.beginPath();
    ctx.moveTo(480, 440);
    ctx.lineTo(620, 440);
    ctx.stroke();

    // Signature labels
    ctx.font = 'italic 16px "Fira Code", monospace';
    ctx.fillStyle = '#00f2fe';
    ctx.fillText('Antigravity AI', 250, 430);
    ctx.fillText('TC Academy', 550, 430);

    ctx.font = '400 11px "Inter", sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.fillText('Authorized Instructor', 250, 460);
    ctx.fillText('Platform Registrar', 550, 460);

    // 6. Enable Download Image Button
    const dlBtn = document.getElementById('btnDownloadCert');
    if (dlBtn) {
        dlBtn.style.display = 'inline-flex';
        dlBtn.onclick = () => {
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `Certificate_${studentName.replace(/\s+/g, '_')}.png`;
            link.href = dataUrl;
            link.click();
        };
    }
}
