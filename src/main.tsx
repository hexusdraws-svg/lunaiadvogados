import { StartClient } from '@tanstack/react-start-client'
import { getRouter } from './router'
import './styles.css'

const router = getRouter()

StartClient({ router })
