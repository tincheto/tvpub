export type ProposalStatus = 'pending' | 'accepted' | 'rejected'

export interface Proposal {
  id: string
  comercio_id: string
  anunciante_id: string
  titulo: string
  descripcion: string
  imagen_url?: string
  video_url?: string
  duracion_segundos: number
  status: ProposalStatus
  started_at?: string
  created_at: string
  updated_at: string
}

export interface Comercio {
  id: string
  nombre: string
  user_id: string
  created_at: string
}

export interface Anunciante {
  id: string
  nombre: string
  user_id: string
  created_at: string
}
