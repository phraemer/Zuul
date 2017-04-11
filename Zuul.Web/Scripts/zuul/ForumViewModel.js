﻿zuul.ForumViewModel = function (initialThreadId, initialReplyId) {
    var self = this;

    self.service = ko.observable(new zuul.ForumService());

    self.threads = ko.observableArray();
    self.threadCount = ko.observable();
    self.pageNumber = ko.observable(1);
    self.pageSize = ko.observable(zuul.constants.pageSize)
    self.selectedPost = ko.observable();
    self.expandedThread = ko.observable();
    self.username = ko.observable();
    self.emailAddress = ko.observable();
    self.password = ko.observable();
    self.passwordConfirm = ko.observable();
    self.newMessageTitle = ko.observable();
    self.newMessageText = ko.observable();
    self.isShowingNewPostForm = ko.observable(false);
    self.isShowingNewAccountFrom = ko.observable(false);
    self.isShowingRegistrationSuccess = ko.observable(false);
    self.loggedInAsUsername = ko.observable();
    self.isLoggedIn = ko.observable(false);
    self.isLoaded = ko.observable(false);
    self.sortOrder = ko.observable(zuul.constants.defaultSortOrder);

    self.isLoadingThreads = ko.observable(false);
    self.isPostingMessage = ko.observable(false);
    self.isCreatingAccount = ko.observable(false);
    self.loadingRepliesForThread = ko.observable();

    self.postToReplyTo = ko.observable();

    self.registerUserError = ko.observable();
    self.getThreadsError = ko.observable();
    self.getRepliesError = ko.observable();
    self.logoutError = ko.observable();
    self.postMessageError = ko.observable("whatever man");

    self.threadPageText = ko.computed(function () {
        var firstThreadNumberOnPage = ((self.pageNumber() - 1) * self.pageSize()) + 1;
        var lastThreadNumberOnPage = self.pageSize() * self.pageNumber();
        if (lastThreadNumberOnPage > self.threadCount()) {
            lastThreadNumberOnPage = self.threadCount();
        }
        if (self.threadCount() === 0) {
            firstThreadNumberOnPage = 0;
        }
        return "{0} - {1} of {2} threads / pages:".format(firstThreadNumberOnPage, lastThreadNumberOnPage, self.threadCount())
    });

    self.totalPages = ko.computed(function () {
        return Math.ceil(self.threadCount() / self.pageSize());
    });

    self.pageNumbers = ko.computed(function () {
        var result = [];
        var firstPage = 1;
        if (self.pageNumber() > 5) {
            firstPage = self.pageNumber() - 5;
        }
        var lastPage = firstPage + 10;
        if (lastPage > self.totalPages()) {
            lastPage = self.totalPages();
        }
        for (var i = firstPage; i <= lastPage; i++) {
            result.push(i);
        }
        return result;
    });

    self.setSortOrder = function (sortOrder) {
        if (sortOrder !== self.sortOrder()) {
            self.sortOrder(sortOrder);
            if (self.sortOrder() === zuul.constants.defaultSortOrder) {
                self.load()
            } else {
                self.isLoadingThreads(true);
                self.service().getThreadsSorted(self.sortOrder())
                    .done(function (threadContextData) {
                        self.populateThreadContext(threadContextData);
                    })
                    .fail(function (jqXHR) {
                        self.populateErrorMessage(self.getThreadsError, jqXHR);
                    })
                    .always(function () {
                        self.isLoadingThreads(false);
                    });
            }
        }
    };

    self.expandThread = function (thread, replyId) {
        self.loadingRepliesForThread(thread);
        self.service().getThreadReplies(thread.id())
            .done(function (threadRepliesData) {
                self.service().addUrlToVisited(thread.url())
                thread.replies(ko.utils.arrayMap(threadRepliesData, function (threadReplyData, index) {
                    var isLastReply = threadRepliesData.length === index + 1;
                    return new zuul.Reply(threadReplyData, [], isLastReply);
                }));
                self.isShowingNewPostForm(false);
                if (self.expandedThread()) {
                    self.expandedThread().isExpanded(false);
                }
                self.expandedThread(thread);
                if (replyId) {
                    self.selectReplyById(thread.replies(), replyId)
                } else {
                    self.selectPost(thread);
                }
                thread.isExpanded(true);
            })
            .fail(function (jqXHR) {
                self.populateErrorMessage(self.getRepliesError, jqXHR);
            })
            .always(function () {
                self.loadingRepliesForThread(null);
            });
    };

    self.dismissThreadsError = function () {
        self.getThreadsError(null);
    };

    self.dismissRepliesError = function () {
        self.getRepliesError(null);
    };

    self.dismissLogoutError = function () {
        self.logoutError(null);
    };

    self.showNewAccountForm = function () {
        self.username(null);
        self.emailAddress(null);
        self.password(null);
        self.passwordConfirm(null);
        self.isShowingNewPostForm(false);
        self.isShowingNewAccountFrom(true);
        self.isShowingRegistrationSuccess(false);
    };

    self.selectPost = function (post) {
        self.isShowingNewPostForm(false);
        self.isShowingNewAccountFrom(false);
        self.isShowingRegistrationSuccess(false);
        if (self.selectedPost()) {
            self.selectedPost().isSelected(false);
        }
        post.isSelected(true);
        self.service().addUrlToVisited(post.url());
        self.selectedPost(post);
    };

    self.reloadThreads = function () {
        self.isShowingNewPostForm(false);
        self.isShowingNewAccountFrom(false);
        self.isShowingRegistrationSuccess(false);
        if (self.expandedThread()) {
            self.expandedThread().isExpanded(false);
        }
        self.expandedThread(undefined);
        self.sortOrder(zuul.constants.defaultSortOrder);
        self.load();
    };

    self.showReplyForm = function (post) {
        self.postMessageError(null);
        self.newMessageText(null);
        if (post.title().startsWith("Re: ")) {
            self.newMessageTitle(post.title());
        } else {
            self.newMessageTitle("Re: {0}".format(post.title()));
        }
        self.postToReplyTo(post);
        self.isShowingNewAccountFrom(false);
        self.isShowingNewPostForm(true);
        self.isShowingRegistrationSuccess(false);
    };

    self.showNewThreadForm = function () {
        self.postMessageError(null);
        self.newMessageText(null);
        self.newMessageTitle(null);
        self.postToReplyTo(null);
        self.isShowingNewAccountFrom(false);
        self.isShowingNewPostForm(true);
        self.isShowingRegistrationSuccess(false);
    };

    self.registerAccount = function () {
        self.isCreatingAccount(true);
        self.registerUserError(null);
        self.service().registerAccount(self.username(), self.emailAddress(), self.password(), self.passwordConfirm())
            .done(function () {
                self.isShowingNewAccountFrom(false);
                self.isShowingRegistrationSuccess(true);
            })
            .fail(function (jqXHR) {
                self.populateErrorMessage(self.registerUserError, jqXHR);
            })
            .always(function () {
                self.isCreatingAccount(false);
                self.password(null);
                self.passwordConfirm(null);
            });
    };

    self.postMessage = function () {
        self.isPostingMessage(true);
        if (!self.isLoggedIn()) {
            self.service().login(self.username(), self.password())
                .done(function (isLoginSuccess) {
                    if (isLoginSuccess) {
                        self.isLoggedIn(isLoginSuccess);
                        self.completePostMessage();
                    } else {
                        var errorMessage = { responseText: "The username / password are incorrect" };
                        self.populateErrorMessage(self.postMessageError, errorMessage);
                        self.isPostingMessage(false);
                    }
                })
                .fail(function (jqXHR) {
                    self.populateErrorMessage(self.postMessageError, jqXHR);
                    self.isPostingMessage(false);
                })
                .always(function () {
                    self.password(null);
                });
        } else {
            self.completePostMessage();
        }
    };

    self.completePostMessage = function () {
        if (!self.postToReplyTo()) {
            self.service().createThread(self.newMessageTitle, self.newMessageText)
                .done(function (threadData) {
                    self.load(threadData.Id);
                })
                .fail(function (jqXHR) {
                    self.populateErrorMessage(self.postMessageError, jqXHR);
                    self.isPostingMessage(false);
                });
        }
        else if (self.postToReplyTo() instanceof zuul.Thread) {
            var threadId = self.postToReplyTo().id();
            self.service().createReplyToThread(threadId, self.newMessageTitle(), self.newMessageText())
                .done(function (replyData) {
                    self.load(threadId, replyData.Id)
                })
                .fail(function (jqXHR) {
                    self.populateErrorMessage(self.postMessageError, jqXHR);
                    self.isPostingMessage(false);
                });
        }
        else if (self.postToReplyTo() instanceof zuul.Reply) {
            var postId = self.postToReplyTo().id();
            var threadId = self.postToReplyTo().threadId();
            self.service().createReplyToPost(threadId, postId, self.newMessageTitle(), self.newMessageText())
                .done(function (replyData) {
                    self.load(threadId, replyData.Id)
                })
                .fail(function (jqXHR) {
                    self.populateErrorMessage(self.postMessageError, jqXHR);
                    self.isPostingMessage(false);
                });
        }
    };

    self.logout = function () {
        self.service().logout()
            .done(function () {
                self.isLoggedIn(false);
                self.loggedInAsUsername(null);
            })
            .fail(function (jqXHR) {
                self.populateErrorMessage(self.logoutError, jqXHR);
            });
    };

    self.selectReplyById = function (replies, replyId) {
        ko.utils.arrayFirst(replies, function (reply) {
            if (reply.id() === replyId) {
                self.selectPost(reply);
                return true;
            } else {
                self.selectReplyById(reply.replies(), replyId);
            }
        });
    };
    
    self.populateThreadContext = function (threadContextData, threadId, replyId) {
        self.loggedInAsUsername(threadContextData.LoggedInAsUsername)
        self.isLoggedIn(!!threadContextData.LoggedInAsUsername);
        self.threadCount(threadContextData.ThreadCount);
        self.pageNumber(threadContextData.PageNumber);
        self.threads(ko.utils.arrayMap(threadContextData.Threads, function (threadData) {
            return new zuul.Thread(threadData);
        }))
        self.isLoaded(true);
        if (threadId) {
            var threadToSelect = ko.utils.arrayFirst(self.threads(), function (thread) {
                return thread.id() === threadId;
            });
            if (threadToSelect) {
                self.expandThread(threadToSelect, replyId);
            }
        }
    };

    self.goBackAPage = function () {
        self.loadPage(self.pageNumber() - 1);
    };

    self.goForwardAPage = function () {
        self.loadPage(self.pageNumber() + 1);
    };

    self.loadPage = function (pageNumber) {
        if (self.sortOrder() === zuul.constants.defaultSortOrder) {
            self.service().getThreadsWithPageNumber(pageNumber)
                .done(self.populateThreadContext)
                .fail(function (jqXHR) {
                    self.populateErrorMessage(self.getThreadsError, jqXHR);
                });
        } else {
            self.service().getThreadsSortedWithPageNumber(self.sortOrder(), pageNumber)
                .done(self.populateThreadContext)
                .fail(function (jqXHR) {
                    self.populateErrorMessage(self.getThreadsError, jqXHR);
                });
        }
        
    };

    self.populateErrorMessage = function (errorMessageObervable, jqXHR) {
        if (jqXHR && jqXHR.responseText) {
            errorMessageObervable(jqXHR.responseText);
        }
        if (jqXHR && jqXHR.responseJSON && jqXHR.responseJSON.ExceptionMessage) {
            errorMessageObervable(jqXHR.responseJSON.ExceptionMessage);
        }
    };

    self.load = function (threadId, replyId) {
        self.isLoadingThreads(true);
        self.service().getThreads()
            .done(function (threadContextData) {
                self.populateThreadContext(threadContextData, threadId, replyId);
                self.isPostingMessage(false);
            })
            .fail(function (jqXHR) {
                self.populateErrorMessage(self.getThreadsError, jqXHR);
            })
            .always(function () {
                self.isLoadingThreads(false);
            });
    };
    self.load(initialThreadId, initialReplyId);
    self.service().resetUrl();
};