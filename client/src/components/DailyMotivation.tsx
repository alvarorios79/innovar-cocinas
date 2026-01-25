import { useMemo } from "react";
import { Sparkles, Heart, Star, Sun, Gift, PartyPopper } from "lucide-react";

// Celebraciones especiales por fecha (mes-día)
const SPECIAL_DATES: Record<string, { title: string; phrases: string[]; icon: "heart" | "gift" | "party" | "star" }> = {
  "01-01": { 
    title: "¡Feliz Año Nuevo!", 
    phrases: [
      "¡Un nuevo año lleno de oportunidades te espera! 🎉",
      "Que este año traiga éxitos y bendiciones para ti y tu familia 🌟",
      "¡Arrancamos el año con toda la energía! 💪"
    ],
    icon: "party"
  },
  "01-06": { 
    title: "Día de Reyes", 
    phrases: [
      "Que la magia de los Reyes Magos ilumine tu día ✨",
      "¡Los sueños se hacen realidad con trabajo y dedicación! 👑"
    ],
    icon: "gift"
  },
  "02-14": { 
    title: "Día del Amor y la Amistad", 
    phrases: [
      "El amor y la amistad hacen más ligero el trabajo ❤️",
      "¡Celebremos juntos el compañerismo que nos une! 💕",
      "Un equipo unido es un equipo invencible 🤝"
    ],
    icon: "heart"
  },
  "03-08": { 
    title: "Día Internacional de la Mujer", 
    phrases: [
      "¡Celebramos la fuerza y talento de las mujeres! 💜",
      "Mujeres que inspiran, transforman y lideran 🌸",
      "Gracias a todas las mujeres que hacen grande a INNOVAR 💪"
    ],
    icon: "heart"
  },
  "03-19": { 
    title: "Día de San José", 
    phrases: [
      "¡Feliz día a todos los José! 🎉",
      "Celebramos a quienes llevan este nombre con orgullo ⭐"
    ],
    icon: "party"
  },
  "03-24": { 
    title: "Domingo de Ramos", 
    phrases: [
      "¡Iniciamos la Semana Santa con fe y esperanza! 🌿",
      "Que esta semana de reflexión nos llene de paz 🙏"
    ],
    icon: "star"
  },
  "03-28": { 
    title: "Jueves Santo", 
    phrases: [
      "Día de reflexión y gratitud 🙏",
      "Que la paz y el amor guíen nuestros pasos ✨"
    ],
    icon: "star"
  },
  "03-29": { 
    title: "Viernes Santo", 
    phrases: [
      "Día de recogimiento y fe 🙏",
      "Que esta jornada nos llene de esperanza ✨"
    ],
    icon: "star"
  },
  "03-31": { 
    title: "Domingo de Resurrección", 
    phrases: [
      "¡Felices Pascuas! Que la alegría de la resurrección llene tu corazón 🌟",
      "Un nuevo comienzo lleno de esperanza y bendiciones ✨"
    ],
    icon: "party"
  },
  "04-26": { 
    title: "Día de la Secretaria", 
    phrases: [
      "¡Gracias por mantener todo en orden! 📋",
      "El corazón administrativo de INNOVAR late gracias a ustedes 💼",
      "¡Feliz día a quienes hacen posible lo imposible! ✨"
    ],
    icon: "star"
  },
  "05-01": { 
    title: "Día del Trabajo", 
    phrases: [
      "¡Feliz día a todos los trabajadores! 🛠️",
      "El trabajo dignifica y construye sueños 💪",
      "Gracias por tu esfuerzo y dedicación diaria 🌟"
    ],
    icon: "star"
  },
  "05-11": { 
    title: "Día de la Madre", 
    phrases: [
      "¡Feliz día a todas las mamás de INNOVAR! 💐",
      "Gracias por ser luz y fortaleza en nuestras vidas 💕",
      "El amor de madre es el motor más poderoso ❤️",
      "¡Celebramos a las mamás que trabajan con amor! 🌸"
    ],
    icon: "heart"
  },
  "06-15": { 
    title: "Día del Padre", 
    phrases: [
      "¡Feliz día a todos los papás de INNOVAR! 👨‍👧‍👦",
      "Gracias por ser ejemplo de trabajo y dedicación 💪",
      "Los padres que trabajan duro inspiran a sus hijos 🌟",
      "¡Celebramos a los papás que construyen hogares! 🏠"
    ],
    icon: "heart"
  },
  "06-29": { 
    title: "Día de San Pedro y San Pablo", 
    phrases: [
      "¡Feliz día a todos los Pedro y Pablo! 🎉",
      "Celebramos con alegría este día especial ⭐"
    ],
    icon: "party"
  },
  "05-15": { 
    title: "Día del Maestro", 
    phrases: [
      "¡Gracias a quienes enseñan con pasión! 📚",
      "Los maestros forman el futuro de Colombia 🌟",
      "Honramos a quienes comparten su conocimiento 🙏"
    ],
    icon: "star"
  },
  "07-04": { 
    title: "Día del Carpintero", 
    phrases: [
      "¡Feliz día a todos los carpinteros de INNOVAR! 🪵",
      "Manos que transforman la madera en arte 🛠️",
      "Gracias por dar vida a cada proyecto con tu talento 🏆"
    ],
    icon: "star"
  },
  "07-16": { 
    title: "Día de la Virgen del Carmen", 
    phrases: [
      "¡Feliz día de la Virgen del Carmen! 🙏",
      "Que la Virgen del Carmen bendiga tu camino ✨",
      "Fe y trabajo, la combinación perfecta 🌟"
    ],
    icon: "star"
  },
  "08-17": { 
    title: "Día del Ingeniero", 
    phrases: [
      "¡Feliz día a todos los ingenieros! 👷",
      "Mentes brillantes que construyen el futuro 💡",
      "Gracias por hacer posible lo imposible 🏆"
    ],
    icon: "star"
  },
  "09-14": { 
    title: "Día del Amor y la Amistad (Colombia)", 
    phrases: [
      "¡Feliz día del Amor y la Amistad! 💕",
      "El compañerismo hace más fácil el trabajo ❤️",
      "Celebramos la amistad que nos une en INNOVAR 🤝"
    ],
    icon: "heart"
  },
  "11-01": { 
    title: "Día de Todos los Santos", 
    phrases: [
      "Día para recordar a quienes ya no están 🙏",
      "Honramos la memoria de nuestros seres queridos ✨"
    ],
    icon: "star"
  },
  "11-11": { 
    title: "Día de la Independencia de Cartagena", 
    phrases: [
      "¡Celebramos la independencia de Cartagena! 🇨🇴",
      "Historia y orgullo colombiano 🌟"
    ],
    icon: "party"
  },
  "07-20": { 
    title: "Día de la Independencia de Colombia", 
    phrases: [
      "¡Viva Colombia! 🇨🇴",
      "Orgullosos de ser colombianos y de trabajar por nuestro país 💛💙❤️",
      "¡Celebramos nuestra libertad con trabajo y alegría! 🎉"
    ],
    icon: "party"
  },
  "08-07": { 
    title: "Batalla de Boyacá", 
    phrases: [
      "Recordamos a quienes lucharon por nuestra libertad 🇨🇴",
      "El esfuerzo de hoy construye el mañana de Colombia 💪"
    ],
    icon: "star"
  },
  "10-12": { 
    title: "Día de la Raza / Día de la Diversidad", 
    phrases: [
      "¡Celebramos la diversidad que nos hace únicos! 🌍",
      "La riqueza de Colombia está en su gente 🇨🇴",
      "Unidos en la diversidad, fuertes en el trabajo 🤝"
    ],
    icon: "party"
  },
  "10-31": { 
    title: "Día de los Niños", 
    phrases: [
      "¡Feliz día a todos los niños! 🎃👻",
      "Que la alegría de los pequeños nos inspire siempre 🧒",
      "Trabajamos para darles un mejor futuro a nuestros hijos 💕"
    ],
    icon: "gift"
  },
  "12-08": { 
    title: "Día de las Velitas", 
    phrases: [
      "¡Que la luz de las velitas ilumine tu camino! 🕯️",
      "Iniciamos la temporada navideña con fe y esperanza ✨"
    ],
    icon: "star"
  },
  "12-24": { 
    title: "Nochebuena", 
    phrases: [
      "¡Feliz Nochebuena para ti y tu familia! 🎄",
      "Que la paz y el amor llenen tu hogar esta noche ❤️",
      "¡Gracias por un año de trabajo y dedicación! 🌟"
    ],
    icon: "gift"
  },
  "12-25": { 
    title: "¡Feliz Navidad!", 
    phrases: [
      "¡Que la magia de la Navidad llene tu corazón! 🎄",
      "Paz, amor y alegría para ti y los tuyos 🎁",
      "¡Feliz Navidad de parte de toda la familia INNOVAR! ❤️"
    ],
    icon: "gift"
  },
  "12-31": { 
    title: "Fin de Año", 
    phrases: [
      "¡Gracias por un año increíble! 🎉",
      "Cerramos el año con gratitud y abrimos el nuevo con esperanza ✨",
      "¡Que el próximo año traiga más éxitos! 🌟"
    ],
    icon: "party"
  },
};

// Frases motivacionales para días normales (365 frases)
const DAILY_PHRASES = [
  "¡Hoy es un gran día para hacer cosas extraordinarias! 💪",
  "Tu trabajo marca la diferencia en cada proyecto ⭐",
  "La excelencia no es un acto, es un hábito. ¡Sigue así! 🌟",
  "Cada detalle cuenta, y tú lo sabes mejor que nadie 🔧",
  "El éxito es la suma de pequeños esfuerzos repetidos día tras día 📈",
  "¡Tu dedicación inspira a todo el equipo! 🙌",
  "Hoy tienes la oportunidad de superar tus propios límites 🚀",
  "La calidad de tu trabajo habla por ti ✨",
  "¡Eres parte fundamental del éxito de INNOVAR! 💚",
  "Cada proyecto es una obra de arte gracias a tu esfuerzo 🎨",
  "El trabajo en equipo hace que los sueños se hagan realidad 🤝",
  "¡Tu actitud positiva contagia a todos! 😊",
  "Hoy es el día perfecto para dar lo mejor de ti 💯",
  "La perseverancia es la clave del éxito 🔑",
  "¡Gracias por poner el corazón en cada proyecto! ❤️",
  "Tu compromiso es el motor que mueve a INNOVAR 🏆",
  "Cada día es una nueva oportunidad para brillar ☀️",
  "El esfuerzo de hoy es el éxito de mañana 🌱",
  "¡Juntos somos más fuertes! 💪",
  "Tu trabajo transforma espacios y vidas 🏠",
  "La creatividad y el esfuerzo van de la mano 🎯",
  "¡Hoy es un día para celebrar tu talento! 🎉",
  "El profesionalismo se nota en cada detalle 👔",
  "¡Sigue adelante, vas por buen camino! 🛤️",
  "Tu energía positiva hace la diferencia 🔋",
  "Cada cliente satisfecho es un logro del equipo 🏅",
  "¡El límite es el cielo! 🌤️",
  "Tu dedicación construye hogares felices 🏡",
  "El trabajo bien hecho es la mejor carta de presentación 📝",
  "¡Hoy es un día para superar expectativas! 🎯",
  "La pasión por lo que haces se refleja en los resultados 🔥",
  "¡Eres un profesional excepcional! ⭐",
  "Cada proyecto terminado es un sueño cumplido 💭",
  "Tu esfuerzo diario construye el futuro de INNOVAR 🏗️",
  "¡La excelencia es tu sello personal! 🏆",
  "Hoy tienes el poder de hacer algo increíble 💫",
  "El trabajo duro siempre da frutos 🍎",
  "¡Tu compromiso es admirable! 👏",
  "Cada día eres mejor que ayer 📊",
  "La calidad es nuestra firma, y tú la representas 🖊️",
  "¡Hoy es un día para brillar con luz propia! ✨",
  "Tu trabajo es la base del éxito de cada proyecto 🧱",
  "El orgullo de un trabajo bien hecho no tiene precio 💎",
  "¡Sigue construyendo sueños! 🌈",
  "Tu talento hace posible lo imposible 🎭",
  "Cada esfuerzo suma para alcanzar grandes metas 🎯",
  "¡Hoy es un día para agradecer tu dedicación! 🙏",
  "El trabajo en equipo multiplica los resultados 📈",
  "Tu actitud define tu altitud 🦅",
  "¡Eres parte de algo grande! 🌍",
  "La constancia es el camino al éxito 🛤️",
  "Hoy tienes la oportunidad de marcar la diferencia 🌟",
  "Tu profesionalismo es un ejemplo a seguir 👨‍🏫",
  "¡El éxito está en los detalles, y tú lo sabes! 🔍",
  "Cada día es una página nueva para escribir tu historia 📖",
  "Tu esfuerzo no pasa desapercibido 👀",
  "¡Hoy es un día para celebrar tus logros! 🎊",
  "El compromiso con la calidad nos hace únicos 💯",
  "Tu trabajo inspira confianza en nuestros clientes 🤝",
  "¡Sigue adelante con esa energía! ⚡",
  "La dedicación es tu superpoder 🦸",
  "Cada proyecto es una oportunidad de crecer 🌱",
  "¡Tu trabajo es invaluable! 💰",
  "El éxito se construye día a día, paso a paso 👣",
  "Tu pasión por el trabajo se nota en cada detalle 💕",
  "¡Hoy es un día para dar lo mejor! 🏆",
  "El trabajo bien hecho genera satisfacción 😊",
  "Tu esfuerzo construye la reputación de INNOVAR 🏛️",
  "¡Eres un pilar fundamental del equipo! 🏛️",
  "La excelencia es un viaje, no un destino 🚀",
  "Hoy tienes todo para triunfar 🏅",
  "Tu compromiso es la base de nuestro éxito 🏆",
  "¡Sigue brillando con tu talento! ✨",
  "El trabajo en equipo hace que todo sea posible 🤝",
  "Tu actitud positiva transforma el ambiente 🌈",
  "¡Hoy es un día para agradecer y celebrar! 🎉",
  "La calidad de tu trabajo habla más que mil palabras 📢",
  "Tu dedicación es el motor del éxito 🚗",
  "¡Eres un ejemplo de profesionalismo! 👔",
  "Cada día es una nueva oportunidad de superarte 📈",
  "Tu esfuerzo diario marca la diferencia 🌟",
  "¡El éxito te espera, sigue adelante! 🎯",
  "La perseverancia siempre da resultados 🏆",
  "Tu trabajo transforma vidas y espacios 🏠",
  "¡Hoy es un día para ser extraordinario! 💫",
  "El compromiso con la excelencia nos define 💎",
  "Tu talento es un regalo para el equipo 🎁",
  "¡Sigue construyendo con pasión! 🔨",
  "La dedicación es la clave de todo logro 🔑",
  "Hoy tienes el poder de inspirar a otros 💪",
  "Tu trabajo es la mejor inversión 📊",
  "¡Eres parte del éxito de INNOVAR! 🏆",
];

// Función para obtener el día del año (1-365)
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

// Función para formatear fecha como "MM-DD"
function formatDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}-${day}`;
}

interface DailyMotivationProps {
  userName?: string;
  className?: string;
  userBirthDate?: Date | null;
}

// Frases de cumpleaños personalizadas
const BIRTHDAY_PHRASES = [
  "¡Feliz cumpleaños, {name}! 🎂 Que este día esté lleno de alegría y bendiciones",
  "¡Hoy es tu día especial, {name}! 🎉 Celebramos contigo otro año de vida",
  "¡Felicidades {name}! 🎁 Que todos tus sueños se hagan realidad",
  "¡Feliz cumpleaños! 🎈 Gracias por ser parte de la familia INNOVAR, {name}",
  "¡Que este nuevo año de vida te traiga mucha felicidad, {name}! 🌟",
];

export function DailyMotivation({ userName, className = "", userBirthDate }: DailyMotivationProps) {
  const today = new Date();
  
  // Verificar si hoy es el cumpleaños del usuario
  // Usamos UTC para evitar problemas de zona horaria ya que birthDate viene como UTC
  const isBirthday = useMemo(() => {
    if (!userBirthDate) return false;
    const birthDate = new Date(userBirthDate);
    // Comparar usando UTC para evitar problemas de zona horaria
    const birthMonth = birthDate.getUTCMonth();
    const birthDay = birthDate.getUTCDate();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    return birthMonth === todayMonth && birthDay === todayDay;
  }, [userBirthDate, today.toDateString()]);
  
  const { phrase, title, isSpecial, icon, isBirthdayMessage } = useMemo(() => {
    // Prioridad 1: Cumpleaños del usuario
    if (isBirthday && userName) {
      const randomIndex = getDayOfYear(today) % BIRTHDAY_PHRASES.length;
      const birthdayPhrase = BIRTHDAY_PHRASES[randomIndex].replace(/{name}/g, userName.split(' ')[0]);
      return {
        phrase: birthdayPhrase,
        title: `¡Feliz Cumpleaños, ${userName.split(' ')[0]}! 🎂`,
        isSpecial: true,
        icon: "gift" as const,
        isBirthdayMessage: true
      };
    }
    
    const dateKey = formatDateKey(today);
    const specialDate = SPECIAL_DATES[dateKey];
    
    if (specialDate) {
      // Es una fecha especial
      const randomIndex = getDayOfYear(today) % specialDate.phrases.length;
      return {
        phrase: specialDate.phrases[randomIndex],
        title: specialDate.title,
        isSpecial: true,
        icon: specialDate.icon,
        isBirthdayMessage: false
      };
    } else {
      // Día normal - seleccionar frase basada en el día del año
      const dayOfYear = getDayOfYear(today);
      const phraseIndex = dayOfYear % DAILY_PHRASES.length;
      return {
        phrase: DAILY_PHRASES[phraseIndex],
        title: null,
        isSpecial: false,
        icon: null,
        isBirthdayMessage: false
      };
    }
  }, [today.toDateString(), isBirthday, userName]);

  const IconComponent = useMemo(() => {
    switch (icon) {
      case "heart": return Heart;
      case "gift": return Gift;
      case "party": return PartyPopper;
      case "star": return Star;
      default: return isSpecial ? Sparkles : Sun;
    }
  }, [icon, isSpecial]);

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      {/* Fondo con gradiente */}
      <div className={`absolute inset-0 ${
        isBirthdayMessage
          ? "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"
          : isSpecial 
            ? "bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500" 
            : "bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500"
      }`} />
      
      {/* Efecto de confeti para cumpleaños */}
      {isBirthdayMessage && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-2 left-[10%] text-2xl animate-bounce" style={{animationDelay: '0s'}}>🎈</div>
          <div className="absolute top-4 left-[30%] text-xl animate-bounce" style={{animationDelay: '0.2s'}}>🎉</div>
          <div className="absolute top-2 left-[50%] text-2xl animate-bounce" style={{animationDelay: '0.4s'}}>🎂</div>
          <div className="absolute top-4 left-[70%] text-xl animate-bounce" style={{animationDelay: '0.6s'}}>🎁</div>
          <div className="absolute top-2 left-[90%] text-2xl animate-bounce" style={{animationDelay: '0.8s'}}>🎈</div>
        </div>
      )}
      
      {/* Patrón decorativo */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16" />
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full translate-x-20 translate-y-20" />
      </div>
      
      {/* Contenido */}
      <div className="relative p-4 md:p-6 text-white">
        <div className="flex items-start gap-3">
          <div className={`p-2 md:p-3 rounded-full ${isSpecial ? "bg-white/30" : "bg-white/20"}`}>
            <IconComponent className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-sm md:text-base font-bold mb-1 text-white/90">
                {title}
              </h3>
            )}
            {userName && !title && (
              <p className="text-xs md:text-sm text-white/80 mb-1">
                ¡Buenos días, {userName}!
              </p>
            )}
            <p className="text-sm md:text-lg font-medium leading-relaxed">
              {phrase}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
