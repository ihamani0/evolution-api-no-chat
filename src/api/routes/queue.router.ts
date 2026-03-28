import { RouterBroker } from '@api/abstract/abstract.router';
import { InstanceDto } from '@api/dto/instance.dto';
import { QueueConfigDto } from '@api/dto/queue.dto';
import { queueController } from '@api/server.module';
import { RequestHandler, Router } from 'express';

import { HttpStatus } from './index.router';

export class QueueRouter extends RouterBroker {
  constructor(...guards: RequestHandler[]) {
    super();
    this.router
      .post(this.routerPath('set'), ...guards, async (req, res) => {
        const response = await this.dataValidate<QueueConfigDto>({
          request: req,
          schema: null,
          ClassRef: QueueConfigDto,
          execute: (instance, data) => queueController.setConfig(instance, data),
        });

        res.status(HttpStatus.CREATED).json(response);
      })
      .get(this.routerPath('find'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: null,
          ClassRef: InstanceDto,
          execute: (instance) => queueController.getConfig(instance),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .get(this.routerPath('status'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: null,
          ClassRef: InstanceDto,
          execute: (instance) => queueController.getStatus(instance),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .get(this.routerPath('messages'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: null,
          ClassRef: InstanceDto,
          execute: (instance) => queueController.getMessages(instance),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post(this.routerPath('process'), ...guards, async (req, res) => {
        const maxMessages = req.query['maxMessages'] ? parseInt(req.query['maxMessages'] as string) : undefined;
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: null,
          ClassRef: InstanceDto,
          execute: (instance) => queueController.processQueue(instance, maxMessages),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .delete(this.routerPath('clear'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: null,
          ClassRef: InstanceDto,
          execute: (instance) => queueController.clearQueue(instance),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .delete(this.routerPath('message/:messageId'), ...guards, async (req, res) => {
        const instanceDto: InstanceDto = { instanceName: req.query.instanceName as string };
        const response = await queueController.removeMessage(instanceDto, req.params.messageId);

        res.status(HttpStatus.OK).json(response);
      });
  }

  public readonly router: Router = Router();
}
