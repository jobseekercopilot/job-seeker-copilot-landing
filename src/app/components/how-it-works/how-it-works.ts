import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-how-it-works',
  templateUrl: './how-it-works.html',
  styleUrl: './how-it-works.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HowItWorksComponent {
  protected readonly steps = [
    { title: 'Set your direction', copy: 'Add the roles, skills, location and working pattern that matter to you.' },
    { title: 'Bring roles together', copy: 'Review relevant opportunities from supported job sources in one workspace.' },
    { title: 'Generate the document pair', copy: 'Create a tailored CV and cover letter together for that specific opportunity.' },
    { title: 'Review and replace', copy: 'Download both files, edit locally if needed, then upload revised versions before applying.' },
    { title: 'Track what happens next', copy: 'Move applications through generated, applied, interview, offer or unsuccessful.' },
  ];
}
