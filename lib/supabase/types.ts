export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string
          access_code: string
          wallet_balance: number
          stamps: Json // This is your "stickers" (Slots, Poker, etc.)
          avatar_id: number
          current_locked_table: string | null
          created_at: string
        }
        Insert: {
          id?: string
          access_code: string
          wallet_balance?: number
          stamps?: Json
          avatar_id?: number
          current_locked_table?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          access_code?: string
          wallet_balance?: number
          stamps?: Json
          avatar_id?: number
          current_locked_table?: string | null
          created_at?: string
        }
      }
      question_bank: {
        Row: {
          id: string
          game_type: 'SLOTS' | 'ROULETTE' | 'BLACKJACK' | 'HOLDEM' | 'CRAPS'
          difficulty: 'STANDARD' | 'HIGH'
          title: string
          problem_statement: string
          starter_code: string
          test_cases: Json // Hidden tests
          is_used: boolean
          is_active: boolean
        }
        Insert: {
          id?: string
          game_type: 'SLOTS' | 'ROULETTE' | 'BLACKJACK' | 'HOLDEM' | 'CRAPS'
          difficulty: 'STANDARD' | 'HIGH'
          title: string
          problem_statement: string
          starter_code: string
          test_cases?: Json
          is_used?: boolean
          is_active?: boolean
        }
        Update: {
          id?: string
          game_type?: 'SLOTS' | 'ROULETTE' | 'BLACKJACK' | 'HOLDEM' | 'CRAPS'
          difficulty?: 'STANDARD' | 'HIGH'
          title?: string
          problem_statement?: string
          starter_code?: string
          test_cases?: Json
          is_used?: boolean
          is_active?: boolean
        }
      }
      transactions: {
        Row: {
          id: string
          team_id: string
          amount: number
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          amount: number
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          amount?: number
          description?: string | null
          created_at?: string
        }
      }
      game_rounds: {
        Row: {
          id: number
          round_number: number
          status: 'LOCKED' | 'ACTIVE' | 'COMPLETED'
          start_time: string | null
          end_time: string | null
        }
        Insert: {
          id?: number
          round_number: number
          status?: 'LOCKED' | 'ACTIVE' | 'COMPLETED'
          start_time?: string | null
          end_time?: string | null
        }
        Update: {
          id?: number
          round_number?: number
          status?: 'LOCKED' | 'ACTIVE' | 'COMPLETED'
          start_time?: string | null
          end_time?: string | null
        }
      }
      event_control: {
        Row: {
          id: number
          current_round: string
          is_paused: boolean
        }
        Insert: {
          id?: number
          current_round?: string
          is_paused?: boolean
        }
        Update: {
          id?: number
          current_round?: string
          is_paused?: boolean
        }
      }
    }
  }
}