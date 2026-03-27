import { RouterBroker } from '@api/abstract/abstract.router';
import { InstanceDto } from '@api/dto/instance.dto';
import { RateLimiterConfigDto } from '@api/dto/rate-limiter.dto';
import { rateLimiterController } from '@api/server.module';
import { rateLimiterConfigSchema } from '@validate/rate-limiter.schema';
import { RequestHandler, Router } from 'express';

import { HttpStatus } from './index.router';

export class RateLimiterRouter extends RouterBroker {
  constructor(...guards: RequestHandler[]) {
    super();
    this.router
      .post(this.routerPath('set'), ...guards, async (req, res) => {
        const response = await this.dataValidate<RateLimiterConfigDto>({
          request: req,
          schema: rateLimiterConfigSchema,
          ClassRef: RateLimiterConfigDto,
          execute: (instance, data) => rateLimiterController.setConfig(instance, data),
        });

        res.status(HttpStatus.CREATED).json(response);
      })
      .get(this.routerPath('find'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: null,
          ClassRef: InstanceDto,
          execute: (instance) => rateLimiterController.getConfig(instance),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .get(this.routerPath('status'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: null,
          ClassRef: InstanceDto,
          execute: (instance) => rateLimiterController.getStatus(instance),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .delete(this.routerPath('reset'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: null,
          ClassRef: InstanceDto,
          execute: (instance) => rateLimiterController.resetLimits(instance),
        });

        res.status(HttpStatus.OK).json(response);
      });
  }

  public readonly router: Router = Router();
}
