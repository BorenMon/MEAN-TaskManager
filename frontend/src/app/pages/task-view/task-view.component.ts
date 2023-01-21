import { Component } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { List } from 'src/app/models/list.model';
import { Task } from 'src/app/models/task.model';
import { TaskService } from 'src/app/task.service';

@Component({
  selector: 'app-task-view',
  templateUrl: './task-view.component.html',
  styleUrls: ['./task-view.component.scss'],
})
export class TaskViewComponent {
  // Font Awesome
  plusIcon = faPlus

  lists?: List[];
  tasks?: Task[];

  constructor(
    private taskService: TaskService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params: Params) => {
      if (params['listId']) {
        this.taskService.getTasks(params['listId']).subscribe((tasks: any) => {
          this.tasks = tasks
        });
      } else {
        this.tasks = undefined
      }
    });

    this.taskService.getLists().subscribe((lists: any) => {
      this.lists = lists;
    });
  }

  onTaskClick(task: Task) {
    // We want to set the task to completed
    this.taskService.complete(task).subscribe(() => {
      // the task has been set to be completed successfully
      task.completed = !task.completed
    })
  }
}
