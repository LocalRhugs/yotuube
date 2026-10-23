// Strings for the /u/ unlock gate, picked from the viewer's browser language (manual translations, no API).
// {n} = seconds. Override with ?lang=xx for testing.

export type GateStrings = {
  locked: string; intro: string; progress: string;
  subscribe: string; like: string; comment: string; discord: string; required: string;
  watch: string; watched: string; keep: string; paused: string; start: string;
  watching: string; verified: string;
  unlock: string; completeSteps: string; checking: string; almost: string;
};

const en: GateStrings = {
  locked: "Content Locked", intro: "Complete the steps below to unlock.", progress: "Your Progress",
  subscribe: "Subscribe to Channel", like: "Like Video", comment: "Comment on Video", discord: "Join Discord Server", required: "Required",
  watch: "Watch Video", watched: "Watched — thanks!", keep: "Keep watching · {n}s left", paused: "Paused — press play to continue · {n}s left", start: "Press play to start · {n}s",
  watching: "Watching... {n}s", verified: "Watch verified",
  unlock: "Unlock Link", completeSteps: "Complete Steps to Unlock", checking: "Checking for completion automatically...", almost: "Almost there — tap Unlock once more.",
};

const STRINGS: Record<string, GateStrings> = {
  en,
  es: {
    locked: "Contenido Bloqueado", intro: "Completa los pasos de abajo para desbloquear.", progress: "Tu Progreso",
    subscribe: "Suscríbete al Canal", like: "Dale Like al Video", comment: "Comenta en el Video", discord: "Únete al Servidor de Discord", required: "Obligatorio",
    watch: "Mira el Video", watched: "¡Visto, gracias!", keep: "Sigue viendo · faltan {n}s", paused: "En pausa: dale play para seguir · faltan {n}s", start: "Dale play para empezar · {n}s",
    watching: "Viendo... {n}s", verified: "Visualización verificada",
    unlock: "Desbloquear Link", completeSteps: "Completa los Pasos para Desbloquear", checking: "Comprobando automáticamente...", almost: "Casi listo: toca Desbloquear una vez más.",
  },
  pt: {
    locked: "Conteúdo Bloqueado", intro: "Complete os passos abaixo para desbloquear.", progress: "Seu Progresso",
    subscribe: "Inscreva-se no Canal", like: "Curta o Vídeo", comment: "Comente no Vídeo", discord: "Entre no Servidor do Discord", required: "Obrigatório",
    watch: "Assista ao Vídeo", watched: "Assistido, valeu!", keep: "Continue assistindo · faltam {n}s", paused: "Pausado: aperte play para continuar · faltam {n}s", start: "Aperte play para começar · {n}s",
    watching: "Assistindo... {n}s", verified: "Visualização confirmada",
    unlock: "Desbloquear Link", completeSteps: "Complete os Passos para Desbloquear", checking: "Verificando automaticamente...", almost: "Quase lá: toque em Desbloquear mais uma vez.",
  },
  fil: {
    locked: "Naka-lock ang Content", intro: "Tapusin ang mga hakbang sa ibaba para ma-unlock.", progress: "Iyong Progress",
    subscribe: "Mag-subscribe sa Channel", like: "I-like ang Video", comment: "Mag-comment sa Video", discord: "Sumali sa Discord Server", required: "Kailangan",
    watch: "Panoorin ang Video", watched: "Napanood na, salamat!", keep: "Ituloy ang panonood · {n}s pa", paused: "Naka-pause: pindutin ang play para ituloy · {n}s pa", start: "Pindutin ang play para magsimula · {n}s",
    watching: "Nanonood... {n}s", verified: "Na-verify ang panonood",
    unlock: "I-unlock ang Link", completeSteps: "Tapusin ang mga Hakbang para Ma-unlock", checking: "Awtomatikong sinusuri...", almost: "Malapit na: pindutin ulit ang I-unlock.",
  },
  id: {
    locked: "Konten Terkunci", intro: "Selesaikan langkah di bawah untuk membuka.", progress: "Progres Kamu",
    subscribe: "Subscribe Channel", like: "Like Video", comment: "Komentar di Video", discord: "Gabung Server Discord", required: "Wajib",
    watch: "Tonton Video", watched: "Sudah ditonton, makasih!", keep: "Terus tonton · sisa {n} detik", paused: "Dijeda: tekan play untuk lanjut · sisa {n} detik", start: "Tekan play untuk mulai · {n} detik",
    watching: "Menonton... {n} detik", verified: "Tontonan terverifikasi",
    unlock: "Buka Link", completeSteps: "Selesaikan Langkah untuk Membuka", checking: "Memeriksa otomatis...", almost: "Sedikit lagi: tekan Buka sekali lagi.",
  },
  ms: {
    locked: "Kandungan Dikunci", intro: "Lengkapkan langkah di bawah untuk membuka.", progress: "Kemajuan Anda",
    subscribe: "Langgan Saluran", like: "Like Video", comment: "Komen di Video", discord: "Sertai Server Discord", required: "Wajib",
    watch: "Tonton Video", watched: "Sudah ditonton, terima kasih!", keep: "Teruskan menonton · baki {n} saat", paused: "Dijeda: tekan play untuk teruskan · baki {n} saat", start: "Tekan play untuk mula · {n} saat",
    watching: "Menonton... {n} saat", verified: "Tontonan disahkan",
    unlock: "Buka Pautan", completeSteps: "Lengkapkan Langkah untuk Membuka", checking: "Menyemak secara automatik...", almost: "Hampir siap: tekan Buka sekali lagi.",
  },
  th: {
    locked: "เนื้อหาถูกล็อก", intro: "ทำตามขั้นตอนด้านล่างเพื่อปลดล็อก", progress: "ความคืบหน้าของคุณ",
    subscribe: "กดติดตามช่อง", like: "กดไลก์วิดีโอ", comment: "คอมเมนต์ในวิดีโอ", discord: "เข้าร่วมเซิร์ฟเวอร์ Discord", required: "จำเป็น",
    watch: "ดูวิดีโอ", watched: "ดูครบแล้ว ขอบคุณ!", keep: "ดูต่อไป · เหลืออีก {n} วินาที", paused: "หยุดชั่วคราว: กดเล่นเพื่อดูต่อ · เหลืออีก {n} วินาที", start: "กดเล่นเพื่อเริ่ม · {n} วินาที",
    watching: "กำลังดู... {n} วินาที", verified: "ยืนยันการดูแล้ว",
    unlock: "ปลดล็อกลิงก์", completeSteps: "ทำขั้นตอนให้ครบเพื่อปลดล็อก", checking: "กำลังตรวจสอบอัตโนมัติ...", almost: "ใกล้แล้ว: กดปลดล็อกอีกครั้ง",
  },
  vi: {
    locked: "Nội Dung Bị Khóa", intro: "Hoàn thành các bước bên dưới để mở khóa.", progress: "Tiến Độ Của Bạn",
    subscribe: "Đăng Ký Kênh", like: "Thích Video", comment: "Bình Luận Video", discord: "Tham Gia Server Discord", required: "Bắt buộc",
    watch: "Xem Video", watched: "Đã xem, cảm ơn!", keep: "Tiếp tục xem · còn {n} giây", paused: "Đã tạm dừng: bấm phát để tiếp tục · còn {n} giây", start: "Bấm phát để bắt đầu · {n} giây",
    watching: "Đang xem... {n} giây", verified: "Đã xác nhận xem",
    unlock: "Mở Khóa Link", completeSteps: "Hoàn Thành Các Bước Để Mở Khóa", checking: "Đang tự động kiểm tra...", almost: "Sắp xong: bấm Mở Khóa thêm một lần.",
  },
  ko: {
    locked: "잠긴 콘텐츠", intro: "아래 단계를 완료하면 잠금이 해제됩니다.", progress: "진행 상황",
    subscribe: "채널 구독하기", like: "영상 좋아요", comment: "영상에 댓글 달기", discord: "디스코드 서버 참가", required: "필수",
    watch: "영상 시청", watched: "시청 완료, 감사합니다!", keep: "계속 시청하세요 · {n}초 남음", paused: "일시정지됨: 재생을 눌러 계속 · {n}초 남음", start: "재생을 눌러 시작 · {n}초",
    watching: "시청 중... {n}초", verified: "시청 확인됨",
    unlock: "링크 잠금 해제", completeSteps: "단계를 완료하면 잠금 해제", checking: "자동으로 확인 중...", almost: "거의 다 됐어요: 잠금 해제를 한 번 더 누르세요.",
  },
  ar: {
    locked: "المحتوى مقفل", intro: "أكمل الخطوات بالأسفل لفتح القفل.", progress: "تقدّمك",
    subscribe: "اشترك في القناة", like: "اعمل لايك للفيديو", comment: "علّق على الفيديو", discord: "انضم لسيرفر الديسكورد", required: "مطلوب",
    watch: "شاهد الفيديو", watched: "تمت المشاهدة، شكرًا!", keep: "كمّل المشاهدة · باقي {n} ثانية", paused: "متوقف: اضغط تشغيل للمتابعة · باقي {n} ثانية", start: "اضغط تشغيل للبدء · {n} ثانية",
    watching: "جاري المشاهدة... {n} ثانية", verified: "تم التحقق من المشاهدة",
    unlock: "افتح الرابط", completeSteps: "أكمل الخطوات لفتح القفل", checking: "جاري التحقق تلقائيًا...", almost: "قربت: اضغط فتح مرة ثانية.",
  },
  ru: {
    locked: "Контент Заблокирован", intro: "Выполни шаги ниже, чтобы разблокировать.", progress: "Твой Прогресс",
    subscribe: "Подпишись на Канал", like: "Поставь Лайк", comment: "Оставь Комментарий", discord: "Зайди на Discord Сервер", required: "Обязательно",
    watch: "Посмотри Видео", watched: "Просмотрено, спасибо!", keep: "Продолжай смотреть · осталось {n} с", paused: "Пауза: нажми play, чтобы продолжить · осталось {n} с", start: "Нажми play, чтобы начать · {n} с",
    watching: "Смотрим... {n} с", verified: "Просмотр подтверждён",
    unlock: "Открыть Ссылку", completeSteps: "Выполни Шаги для Разблокировки", checking: "Проверяем автоматически...", almost: "Почти готово: нажми Открыть ещё раз.",
  },
  de: {
    locked: "Inhalt Gesperrt", intro: "Erledige die Schritte unten zum Freischalten.", progress: "Dein Fortschritt",
    subscribe: "Kanal Abonnieren", like: "Video Liken", comment: "Video Kommentieren", discord: "Discord Server Beitreten", required: "Erforderlich",
    watch: "Video Ansehen", watched: "Angesehen, danke!", keep: "Weiter ansehen · noch {n}s", paused: "Pausiert: drücke Play zum Fortfahren · noch {n}s", start: "Drücke Play zum Starten · {n}s",
    watching: "Läuft... {n}s", verified: "Ansehen bestätigt",
    unlock: "Link Freischalten", completeSteps: "Schritte Erledigen zum Freischalten", checking: "Wird automatisch geprüft...", almost: "Fast geschafft: tippe noch einmal auf Freischalten.",
  },
  fr: {
    locked: "Contenu Verrouillé", intro: "Termine les étapes ci-dessous pour débloquer.", progress: "Ta Progression",
    subscribe: "S'abonner à la Chaîne", like: "Liker la Vidéo", comment: "Commenter la Vidéo", discord: "Rejoindre le Serveur Discord", required: "Obligatoire",
    watch: "Regarder la Vidéo", watched: "Regardée, merci !", keep: "Continue à regarder · encore {n}s", paused: "En pause : appuie sur lecture pour continuer · encore {n}s", start: "Appuie sur lecture pour commencer · {n}s",
    watching: "Lecture... {n}s", verified: "Visionnage vérifié",
    unlock: "Débloquer le Lien", completeSteps: "Termine les Étapes pour Débloquer", checking: "Vérification automatique...", almost: "Presque fini : appuie encore une fois sur Débloquer.",
  },
  tr: {
    locked: "İçerik Kilitli", intro: "Kilidi açmak için aşağıdaki adımları tamamla.", progress: "İlerlemen",
    subscribe: "Kanala Abone Ol", like: "Videoyu Beğen", comment: "Videoya Yorum Yap", discord: "Discord Sunucusuna Katıl", required: "Zorunlu",
    watch: "Videoyu İzle", watched: "İzlendi, teşekkürler!", keep: "İzlemeye devam et · {n} sn kaldı", paused: "Duraklatıldı: devam için oynat'a bas · {n} sn kaldı", start: "Başlamak için oynat'a bas · {n} sn",
    watching: "İzleniyor... {n} sn", verified: "İzleme doğrulandı",
    unlock: "Linkin Kilidini Aç", completeSteps: "Kilidi Açmak için Adımları Tamamla", checking: "Otomatik kontrol ediliyor...", almost: "Az kaldı: Kilidi Aç'a bir kez daha bas.",
  },
};

const ALIASES: Record<string, string> = { tl: "fil", in: "id", pt: "pt", "pt-br": "pt" };

export function detectGateLang(): string {
  try {
    const forced = new URLSearchParams(window.location.search).get("lang");
    const list = [forced, ...(navigator.languages || []), navigator.language].filter(Boolean) as string[];
    for (const raw of list) {
      const code = raw.toLowerCase();
      const base = ALIASES[code] || ALIASES[code.split("-")[0]] || code.split("-")[0];
      if (STRINGS[base]) return base;
    }
  } catch {}
  return "en";
}

export function gateStrings(lang: string): GateStrings {
  return STRINGS[lang] || en;
}

export const fmt = (s: string, n: number) => s.replace("{n}", String(n));
