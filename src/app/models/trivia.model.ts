export interface Guest {
  id: string;
  name: string;
  token: string;
  has_played: boolean;
  current_question_index: number;
  accumulated_score: number;
  accumulated_time_seconds: number;
}

export interface LeaderboardEntry {
  player_name: string;
  score: number;
  total_time_seconds: number;
}

export interface QuestionOption {
  text?: string; // Texto opcional (ej: "Lugar A")
  image_url: string; // URL obligatoria de la imagen de la opción
}

export interface Question {
  id: number;
  order_index: number;
  question_text: string;
  options: QuestionOption[]; // Ahora es un array de objetos con imagen
  correct_index: number;
  image_url?: string | null;
}
