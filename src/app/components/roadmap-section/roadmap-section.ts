import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import { RouterLink } from '@angular/router';
import {PUBLIC_APP_CONFIG} from '../../config/public-app-config';

interface RoadmapItem {
  title: string;
  copy: string;
  marker: string;
}

@Component({
  selector: 'app-roadmap-section',
  imports: [RouterLink],
  templateUrl: './roadmap-section.html',
  styleUrl: './roadmap-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoadmapSectionComponent {
  protected readonly config = inject(PUBLIC_APP_CONFIG);
  protected readonly items: RoadmapItem[] = [
    { marker: '01', title: 'Job match analysis', copy: 'Compare your experience with a job description and identify potential skills gaps to work on.' },
    { marker: '02', title: 'Built-in document editor', copy: 'Edit generated CVs and cover letters directly in the workspace without external software.' },
    { marker: '03', title: 'Personal career profile', copy: 'Maintain a master CV and richer profile for more accurate, personalised documents.' },
    { marker: '04', title: 'Application question assistant', copy: 'Prepare tailored answers for application forms and pre-interview questions.' },
    { marker: '05', title: 'Interview preparation', copy: 'Generate likely questions from the job description and get guidance for preparing answers.' },
    { marker: '06', title: 'STAR answer generator', copy: 'Shape examples from your own experience into clear situation, task, action and result responses.' },
    { marker: '07', title: 'New job preparation', copy: 'Build practical checklists and personalised guidance for getting ready to start a new role.' },
  ];
}
