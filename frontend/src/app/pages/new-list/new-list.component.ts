import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { List } from '../../models/list.model';
import { TaskService } from '../../task.service';

@Component({
  selector: 'app-new-list',
  templateUrl: './new-list.component.html',
  styleUrls: ['./new-list.component.scss']
})
export class NewListComponent {
  constructor(private taskService: TaskService, private router: Router) {}

  createList(title: string) {
this.taskService.createList(title).subscribe((list: List) => {
      // Now we navigate to /lists/response._id
      this.router.navigate([ '/lists', list._id ])
    })
  }
}
