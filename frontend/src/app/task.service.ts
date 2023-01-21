import { Injectable } from '@angular/core';
import { List } from './models/list.model';
import { Task } from './models/task.model';
import { WebRequestService } from './web-request.service';

@Injectable({
  providedIn: 'root'
})
export class TaskService {

  constructor(private webReqService: WebRequestService) { }

  getLists() {
    return this.webReqService.get('lists')
  }
  
  createList(title: string) {
    // We want to send a web request to create list
    return this.webReqService.post('lists', { title })
  }

  getTasks(listId: string) {
    return this.webReqService.get(`lists/${listId}/tasks`)
  }

  createTask(title: string, listId: string) {
    // We want to send a web request to create task
    return this.webReqService.post(`lists/${listId}/tasks`, { title })
  }

  complete(task: Task) {
    return this.webReqService.patch(`lists/${task._listId}/tasks/${task._id}`, {
      completed: !task.completed
    })
  }
}
