export enum SecurityQuestion {
  SPORT = 1,
  EMPLOYER,
  CAR,
}

export enum SecurityAnswer {
  SPORT = 1,
  EMPLOYER,
  CAR,
}

export const SecurityQuestionAnswer: Record<SecurityQuestion, SecurityAnswer> =
  {
    [SecurityQuestion.SPORT]: SecurityAnswer.SPORT,
    [SecurityQuestion.EMPLOYER]: SecurityAnswer.EMPLOYER,
    [SecurityQuestion.CAR]: SecurityAnswer.CAR,
  };

export class SecurityAnswerRegistry {
  private readonly answers: Partial<Record<SecurityAnswer, string>>;
  constructor() {
    this.answers = {};
  }
  registerAnswers(answers: {type: SecurityAnswer; answer: string}[]) {
    answers.forEach(a => (this.answers[a.type] = a.answer));
  }
  public getAnswer(question: SecurityQuestion): string {
    const ansType: SecurityAnswer = SecurityQuestionAnswer[question];
    if (ansType === undefined) throw new Error('unsupported security question');
    const answer: string | undefined = this.answers[ansType];
    if (answer === undefined || answer === '')
      throw new Error(`no answer registered, answer type: ${ansType}`);
    return answer;
  }
}
