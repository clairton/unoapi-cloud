import { Router } from 'express'
import injectRoute from './inject_route'

const injectRouteDummy: injectRoute = async (_router: Router) => {}
export default injectRouteDummy
