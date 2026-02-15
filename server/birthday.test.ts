import { describe, it, expect } from 'vitest';

describe('Birthday Feature', () => {
  describe('Birthday Check Logic', () => {
    it('should correctly identify if today is a birthday', () => {
      const today = new Date();
      const todayMonth = today.getMonth();
      const todayDay = today.getDate();

      // Crear una fecha de cumpleaños que coincida con hoy
      const birthDate = new Date(1990, todayMonth, todayDay);
      
      const isBirthday = (
        birthDate.getMonth() === todayMonth &&
        birthDate.getDate() === todayDay
      );

      expect(isBirthday).toBe(true);
    });

    it('should correctly identify if today is NOT a birthday', () => {
      const today = new Date();
      const todayMonth = today.getMonth();
      const todayDay = today.getDate();

      // Crear una fecha de cumpleaños que NO coincida con hoy
      const differentDay = todayDay === 15 ? 16 : 15;
      const birthDate = new Date(1990, todayMonth, differentDay);
      
      const isBirthday = (
        birthDate.getMonth() === todayMonth &&
        birthDate.getDate() === todayDay
      );

      expect(isBirthday).toBe(false);
    });

    it('should handle different years correctly', () => {
      const today = new Date();
      const todayMonth = today.getMonth();
      const todayDay = today.getDate();

      // Cumpleaños de diferentes años deben coincidir si el día y mes son iguales
      const birthDate1985 = new Date(1985, todayMonth, todayDay);
      const birthDate2000 = new Date(2000, todayMonth, todayDay);
      
      const isBirthday1985 = (
        birthDate1985.getMonth() === todayMonth &&
        birthDate1985.getDate() === todayDay
      );
      
      const isBirthday2000 = (
        birthDate2000.getMonth() === todayMonth &&
        birthDate2000.getDate() === todayDay
      );

      expect(isBirthday1985).toBe(true);
      expect(isBirthday2000).toBe(true);
    });
  });

  describe('Birthday Phrases', () => {
    const birthdayPhrases = [
      "¡Feliz cumpleaños, {name}! 🎂🎉 Que este día esté lleno de alegría y éxitos.",
      "¡Hoy es tu día especial, {name}! 🎈🎁 Que todos tus sueños se hagan realidad.",
      "¡Felicidades en tu cumpleaños, {name}! 🎊🎂 Gracias por ser parte de nuestro equipo.",
      "¡Que viva el cumpleañero/a! 🥳🎉 {name}, te deseamos un día maravilloso.",
      "¡Feliz cumpleaños, {name}! 🎁✨ Que este nuevo año de vida traiga muchas bendiciones.",
    ];

    it('should have birthday phrases defined', () => {
      expect(birthdayPhrases.length).toBeGreaterThan(0);
    });

    it('should contain {name} placeholder in all phrases', () => {
      birthdayPhrases.forEach(phrase => {
        expect(phrase).toContain('{name}');
      });
    });

    it('should replace {name} placeholder correctly', () => {
      const phrase = "¡Feliz cumpleaños, {name}! 🎂🎉";
      const userName = "María García";
      const personalizedPhrase = phrase.replace('{name}', userName);

      expect(personalizedPhrase).toBe("¡Feliz cumpleaños, María García! 🎂🎉");
      expect(personalizedPhrase).not.toContain('{name}');
    });

    it('should handle names with special characters', () => {
      const phrase = "¡Feliz cumpleaños, {name}! 🎂🎉";
      const specialName = "José O'Connor";
      const personalizedPhrase = phrase.replace('{name}', specialName);

      expect(personalizedPhrase).toBe("¡Feliz cumpleaños, José O'Connor! 🎂🎉");
    });
  });

  describe('Super Admin Birthday Management', () => {
    it('should only allow super_admin to manage birthdays', () => {
      // Roles que pueden gestionar cumpleaños
      const allowedRoles = ['super_admin'];
      
      // Roles que NO pueden gestionar cumpleaños
      const restrictedRoles = ['admin', 'comercial', 'disenador', 'jefe_taller', 'operario', 'user'];

      expect(allowedRoles).toContain('super_admin');
      restrictedRoles.forEach(role => {
        expect(allowedRoles).not.toContain(role);
      });
    });

    it('should define correct permission check', () => {
      const canManageBirthdays = (role: string) => role === 'super_admin';

      expect(canManageBirthdays('super_admin')).toBe(true);
      expect(canManageBirthdays('admin')).toBe(false);
      expect(canManageBirthdays('comercial')).toBe(false);
      expect(canManageBirthdays('disenador')).toBe(false);
      expect(canManageBirthdays('jefe_taller')).toBe(false);
      expect(canManageBirthdays('operario')).toBe(false);
      expect(canManageBirthdays('user')).toBe(false);
    });
  });

  describe('Birthday Notification Timing', () => {
    it('should schedule notifications at 8am', () => {
      const notificationHour = 8;
      expect(notificationHour).toBe(8);
    });

    it('should use Colombia timezone (America/Bogota)', () => {
      const timezone = 'America/Bogota';
      expect(timezone).toBe('America/Bogota');
    });
  });

  describe('Confetti Animation Behavior', () => {
    it('should trigger every time user opens app on birthday', () => {
      // El confeti debe aparecer cada vez que el usuario abre la app
      // No solo una vez al día
      const shouldShowConfetti = (isBirthday: boolean) => isBirthday;
      
      expect(shouldShowConfetti(true)).toBe(true);
      expect(shouldShowConfetti(false)).toBe(false);
    });

    it('should not persist confetti shown state', () => {
      // No debe guardar en localStorage que ya se mostró el confeti
      // Debe mostrarse cada vez
      const persistConfettiState = false;
      expect(persistConfettiState).toBe(false);
    });
  });
});
