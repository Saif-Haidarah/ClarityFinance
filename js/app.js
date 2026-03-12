/**
 * ClarityFinance - المحرك البرمجي
 */
const App = {
    init() {
        console.log("النظام جاهز...");
        this.setupListeners();
    },

    // التبديل بين الشاشات
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
        document.getElementById(`screen-${screenId}`).style.display = 'block';
    },

    setupListeners() {
        // هنا سنضيف كود معالجة الملفات لاحقاً
    }
};

window.onload = () => App.init();
