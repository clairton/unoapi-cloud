import { Request, Response } from "express";

class IndexController {

  public ping(_req: Request, res: Response) {
    return res.send("pong!")
  }
}

export const indexController = new IndexController();